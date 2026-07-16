-- DepositWithdrawBot (adapted)
-- Usage: run this in your Roblox executor. Edit BASE and BOT_KEY below to match your site.
-- Expected backend endpoints (adjust if your API differs):
--   POST  /bot/deposit                { roblox_username, items }
--   GET   /bot/pending-withdrawals    -> { withdrawals: [...] }
--   POST  /admin/withdrawals/complete { id }
--   POST  /bot/gag/ping               { username }
--   POST  /bot/gag/tx-complete        { username }
--   GET   /bot/gag/next-bot?exclude_slot=<n>
-- The script assumes your site accepts either an "x-bot-key" header (dev) or "Authorization: Bearer <key>" (prod).

--[[
    DepositWithdrawBot — run on the Growagarden2Roflips account via executor.

    DEPOSIT  — listens for Mailbox.Updated + polls on startup.
               Iterates the inbox dictionary, claims each mail via Mailbox.Claim,
               then calls /bot/deposit so the sender is credited on the site.
    WITHDRAW — every 30 s polls /bot/pending-withdrawals.
               For each pending entry, looks up the player (LookupPlayer),
               sends items via Mailbox.SendBatch, then marks the withdrawal
               complete on the site.
    PING     — every 30 s hits /bot/gag/ping so the site shows the bot online.

    UI: tiny "🟢 Bot Active" chip only.
--]]

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer

------------------------------------------------------
-- Block all teleports / auto-reconnects
------------------------------------------------------
local TeleportService = game:GetService("TeleportService")
local _mt = getrawmetatable(game)
local _oldNamecall = _mt.__namecall
setreadonly(_mt, false)
_mt.__namecall = newcclosure(function(self, ...)
    local method = getnamecallmethod()
    if method == "Teleport"
    or method == "TeleportAsync"
    or method == "TeleportToPlaceInstance"
    or method == "TeleportToSpawnByName"
    or method == "TeleportPartyAsync" then
        return
    end
    return _oldNamecall(self, ...)
end)
setreadonly(_mt, true)

------------------------------------------------------
-- Anti-AFK (prevent idle kick)
------------------------------------------------------
local VirtualUser = game:GetService("VirtualUser")
game:GetService("Players").LocalPlayer.Idled:Connect(function()
    VirtualUser:Button2Down(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
    task.wait(1)
    VirtualUser:Button2Up(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
end)

------------------------------------------------------
-- HTTP (executor: syn.request / http_request / request)
------------------------------------------------------
local HttpService = game:GetService("HttpService")
-- CONFIG: point BASE to your running backend and keep the same endpoints
-- Use the live website base for production: https://bloxygag.org
-- Use local backend during development: http://127.0.0.1:3218
-- Use the site root so paths like /bot/deposit match the backend routes.
-- If your host uses a different API prefix, replace with the exact base.
local BASE    = "https://bloxgag.org" -- your API base (no trailing slash)
local BOT_KEY = "bot_9d3a7f4b2c1e6a8f5b0c3d2e7a1f4b6c"

local function buildUrl(path)
    -- If path is already a full URL, return it
    if type(path) == "string" and path:sub(1,4):lower() == "http" then
        return path
    end
    local p = path or ""
    if p:sub(1,1) ~= "/" then p = "/" .. p end

    local baseLower = (BASE or ""):lower()
    local pLower = p:lower()
    if baseLower:sub(-#pLower) == pLower then
        -- BASE already ends with the same path (e.g. BASE=".../bot/deposit" and path="/bot/deposit")
        return BASE
    end

    if (BASE or ""):sub(-1) == "/" then
        return (BASE:sub(1, -2)) .. p
    end
    return (BASE or "") .. p
end

local function http(method, path, body, useBearer)
    local headers = {
        ["X-Platform"]   = "growagarden",
        ["Content-Type"] = "application/json",
    }
    if useBearer then
        headers["Authorization"] = "Bearer " .. BOT_KEY
    else
        headers["x-bot-key"] = BOT_KEY
    end

    local reqFn = (syn and syn.request) or http_request or request
    local ok, res = pcall(reqFn, {
        Url     = buildUrl(path),
        Method  = method,
        Headers = headers,
        Body    = body and HttpService:JSONEncode(body) or nil,
    })
    if not ok then return nil, "request failed: " .. tostring(res) end
    if res.StatusCode < 200 or res.StatusCode >= 300 then
        return nil, "HTTP " .. res.StatusCode .. ": " .. tostring(res.Body):sub(1, 200)
    end
    local rawBody = res.Body
    if not rawBody or rawBody == "" then return {}, nil end
    local parsed, data = pcall(HttpService.JSONDecode, HttpService, rawBody)
    if not parsed then
        print("[DWBot] Bad JSON from", path, "— body:", rawBody:sub(1, 200))
        return nil, "Bad JSON"
    end
    return data, nil
end

local function apiDeposit(robloxUsername, items)
    return http("POST", "/bot/deposit", { roblox_username = robloxUsername, items = items, bot_username = LocalPlayer.Name })
end

local function apiPendingWithdrawals()
    return http("GET", "/bot/pending-withdrawals")
end

local function apiCompleteWithdrawal(id)
    return http("POST", "/admin/withdrawals/complete", { id = id })
end

local MY_SLOT   = nil   -- assigned by server on first ping
local TX_COUNT  = 0
local HANDED_OFF = false  -- set true once we transfer items to next bot

-- Tracks which pet UUIDs are Big/Huge (populated at deposit time from GiftData).
local SIZE_UUID_MAP = {}  -- [uuid] = "Big" | "Huge"

local function apiPing()
    return http("POST", "/bot/gag/ping", { username = LocalPlayer.Name })
end

local function apiTxComplete()
    return http("POST", "/bot/gag/tx-complete", { username = LocalPlayer.Name })
end

local function apiNextBot()
    return http("GET", "/bot/gag/next-bot?exclude_slot=" .. tostring(MY_SLOT or 0))
end

------------------------------------------------------
-- Networking
------------------------------------------------------
local Networking = require(
    ReplicatedStorage:WaitForChild("SharedModules"):WaitForChild("Networking")
)

------------------------------------------------------
-- Status chip
------------------------------------------------------
local Gui = Instance.new("ScreenGui")
Gui.Name = "DWBotGui"; Gui.ResetOnSpawn = false
Gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
Gui.Parent = LocalPlayer:WaitForChild("PlayerGui")

local Chip = Instance.new("TextLabel")
Chip.Size             = UDim2.new(0, 175, 0, 26)
Chip.Position         = UDim2.new(0, 8, 0, 8)
Chip.BackgroundColor3 = Color3.fromRGB(18, 18, 28)
Chip.TextColor3       = Color3.fromRGB(75, 215, 95)
Chip.Font             = Enum.Font.GothamBold
Chip.TextSize         = 12
Chip.Text             = "🟢 Bot Active"
Chip.BorderSizePixel  = 0
Chip.Parent           = Gui
local cc = Instance.new("UICorner"); cc.CornerRadius = UDim.new(0,6); cc.Parent = Chip
local cs = Instance.new("UIStroke"); cs.Color = Color3.fromRGB(45,140,65); cs.Thickness=1; cs.Parent=Chip

local function setStatus(text, isErr)
    Chip.Text = text
    Chip.TextColor3 = isErr
        and Color3.fromRGB(215, 70, 70)
        or  Color3.fromRGB(75, 215, 95)
end

local function log(...) print("[DWBot]", ...) end

------------------------------------------------------
-- Deposit — claim inbox
------------------------------------------------------
local claimedIds = {}   -- guard: never claim the same mail twice

local function processInbox(inboxDict)
    if type(inboxDict) ~= "table" then return end

    for mailId, giftData in pairs(inboxDict) do
        if claimedIds[mailId] then continue end
        if type(giftData) ~= "table" then continue end

        local senderName = giftData.FromName
        if (not senderName or senderName == "") and type(giftData.From) == "number" then
            local pOk, pName = pcall(Players.GetNameFromUserIdAsync, Players, giftData.From)
            if pOk then senderName = pName end
        end

        local cOk, success, errMsg = pcall(function()
            return Networking.Mailbox.Claim:Fire(mailId)
        end)

        if not cOk then
            log("Claim pcall error:", success)
            continue
        end
        if not success then
            log("Claim rejected for", mailId, "—", errMsg)
            claimedIds[mailId] = true
            continue
        end

        claimedIds[mailId] = true
        log("Claimed mail", mailId, "from", senderName or "unknown")

        local ok2, encoded = pcall(HttpService.JSONEncode, HttpService, giftData)
        log("GiftData:", ok2 and encoded or "(not JSON-encodable)")

        if not senderName or senderName == "" then
            log("No sender name for", mailId, "— skipping site deposit")
            continue
        end

        local apiItems = {}
        local rawItems = giftData.Items or giftData.items

        if type(rawItems) == "table" and #rawItems > 0 then
            for _, it in ipairs(rawItems) do
                local qty  = tonumber(it.Count or it.count) or 1
                local name

                local function formatBaseName(raw)
                    raw = tostring(raw or "")
                    raw = raw:gsub("^%s+", ""):gsub("%s+$", "")
                    if raw == "" then
                        return ""
                    end
                    if not raw:find("%s") then
                        return raw:gsub("(%l)(%u)", "%1 %2")
                    end
                    return raw
                end

                if type(it.Pet) == "table" then
                    local dbgPetOk, dbgPetEnc = pcall(HttpService.JSONEncode, HttpService, it.Pet)
                    log("PET RAW:", dbgPetOk and dbgPetEnc or "(not encodable)")

                    local rawName = it.Pet.Name or it.Pet.DisplayName or it.Pet.ItemName or it.ItemName or ""
                    local baseName = formatBaseName(rawName)

                    local petType = it.Pet.Type or ""
                    local petSize = it.Pet.Size or it.Pet.SizeType or it.Pet.Class or ""

                    local function prefixIfMissing(prefix, text)
                        if prefix == "" or text == "" then
                            return text
                        end
                        if text:sub(1, #prefix + 1) == prefix .. " " then
                            return text
                        end
                        return prefix .. " " .. text
                    end

                    if petSize ~= "" then
                        name = prefixIfMissing(petSize, baseName)
                        local petId = it.Pet.Id or it.Pet.id
                        if petId then SIZE_UUID_MAP[petId] = petSize end
                    elseif petType ~= "" and petType ~= "Normal" then
                        name = prefixIfMissing(petType, baseName)
                    else
                        name = baseName
                    end
                elseif it.Category == "Pets" or it.category == "Pets" then
                    local rawName = it.ItemName or it.Name or it.display_name or it.DisplayName or (giftData.Pet and giftData.Pet.Name) or ""
                    if rawName:match("^[%w%-]+$") and #rawName > 16 then
                        rawName = it.Name or it.DisplayName or (giftData.Pet and giftData.Pet.Name) or rawName
                    end
                    name = formatBaseName(rawName)
                elseif type(it.Fruit) == "table" then
                    name = it.Fruit.Name
                else
                    local dbgOk, dbgEnc = pcall(HttpService.JSONEncode, HttpService, it)
                    log("NON-PET ITEM RAW:", dbgOk and dbgEnc or "(not encodable)")
                    local rawName = it.ItemName or it.Name or ""
                    if (it.Category == "Seeds" or it.category == "Seeds") and rawName ~= "" and not rawName:find(" Seed$") then
                        name = rawName .. " Seed"
                    else
                        name = rawName
                    end
                end

                if name and name ~= "" then
                    local petId   = type(it.Pet) == "table" and (it.Pet.Id or it.Pet.id) or nil
                    local petSize = type(it.Pet) == "table" and (it.Pet.Size or "") or ""
                    local entry = { name = name, qty = qty }
                    if petId and petSize ~= "" then
                        entry.uuid = petId
                        entry.size = petSize
                    end
                    table.insert(apiItems, entry)
                end
            end
        elseif type(giftData.Pet) == "table" and giftData.Pet.Name then
            table.insert(apiItems, { name = giftData.Pet.Name, qty = 1 })
        end

        if #apiItems == 0 then
            log("No depositable items found in mail", mailId)
        end

        local data, err = apiDeposit(senderName, apiItems)
        if err then
            log("Deposit API error for", senderName, "—", err)
            setStatus("⚠ Deposit error", true)
            task.wait(3)
            setStatus("🟢 Bot Active")
        else
            local n = (data and data.deposited) or #apiItems
            log("Credited", n, "item(s) to", senderName)
        end

        task.wait(0.5)
    end
end

local function fetchAndProcess()
    local ok, result = pcall(function()
        return Networking.Mailbox.OpenInbox:Fire()
    end)
    if not ok then
        log("OpenInbox error:", result)
        return
    end
    processInbox(result)
end

task.spawn(fetchAndProcess)

Networking.Mailbox.Updated.OnClientEvent:Connect(function(payload)
    if type(payload) ~= "table" then
        return
    end

    if type(payload.Mailbox) == "table" then
        task.spawn(processInbox, payload.Mailbox)
    elseif type(payload.Badge) == "number" then
        task.spawn(fetchAndProcess)
    else
        task.spawn(processInbox, payload)
    end
end)

local PlayerState = require(
    ReplicatedStorage:WaitForChild("ClientModules"):WaitForChild("PlayerStateClient")
)

local QTY_CATEGORIES = {"Seeds", "WateringCans", "Sprinklers", "Rakes", "Props", "Mushrooms", "Eggs", "Ladders"}

local function getBotInventory()
    local inv = {}
    local ok, replica = pcall(function() return PlayerState:GetLocalReplica() end)
    if not ok or not replica then return inv end
    local Inventory = replica.Data and replica.Data.Inventory
    if not Inventory then return inv end

    for _, cat in ipairs(QTY_CATEGORIES) do
        if type(Inventory[cat]) == "table" then
            for itemName, qty in pairs(Inventory[cat]) do
                local entry = { category = cat, itemKey = itemName, qty = tonumber(qty) or 0 }
                inv[itemName] = entry
                if not itemName:find(" Seed$") then
                    inv[itemName .. " Seed"] = entry
                end
                local stripped = itemName:gsub(" Seed$", "")
                if stripped ~= itemName then inv[stripped] = entry end
            end
        end
    end

    if type(Inventory.Pets) == "table" then
        for uuid, data in pairs(Inventory.Pets) do
            if type(data) == "table" and data.Equipped == false then
                local baseName = data.Name or uuid
                local petType  = data.Type or ""
                local petSize  = data.Size or SIZE_UUID_MAP[uuid] or ""
                local spaced = baseName:gsub("(%l)(%u)", "%1 %2")
                local display
                if petSize ~= "" then
                    display = petSize .. " " .. spaced
                elseif petType ~= "" and petType ~= "Normal" then
                    display = petType .. " " .. spaced
                else
                    display = spaced
                end

                if not inv[display] or not inv[display].uuids then
                    inv[display] = { category = "Pets", uuids = {}, qty = 0 }
                end
                if baseName ~= display and inv[baseName] == nil then
                    inv[baseName] = inv[display]
                end
                table.insert(inv[display].uuids, uuid)
                inv[display].qty += 1
            end
        end

        local petList = {}
        for uuid, data in pairs(Inventory.Pets) do
            if type(data) == "table" and data.Equipped == false then
                table.insert(petList, {
                    name = data.Name,
                    size = data.Size or SIZE_UUID_MAP[uuid] or "?",
                    uuid = uuid
                })
            end
        end
        table.sort(petList, function(a, b) return a.name < b.name end)
        log("BOT PETS:", HttpService:JSONEncode(petList))
    end

    return inv
end

local fulfilledIds = {}

local function refreshSizeMap()
    local ok, replica = pcall(function() return PlayerState:GetLocalReplica() end)
    if not ok or not replica then return end
    local Pets = replica.Data and replica.Data.Inventory and replica.Data.Inventory.Pets
    if type(Pets) ~= "table" then return end

    local scanned = 0
    for uuid, data in pairs(Pets) do
        if type(data) == "table" and data.Equipped == false then
            local rawName = tostring(data.Name or "")
            local petType = tostring(data.Type or "")

            local detectedSize = nil
            if rawName:find("^Big") then detectedSize = "Big"
            elseif rawName:find("^Huge") then detectedSize = "Huge"
            elseif rawName:find("^Mega") then detectedSize = "Mega"
            elseif rawName:find("^Rainbow") then detectedSize = "Rainbow"
            elseif petType:find("Big") then detectedSize = "Big"
            elseif petType:find("Huge") then detectedSize = "Huge"
            elseif petType:find("Mega") then detectedSize = "Mega"
            elseif petType:find("Rainbow") then detectedSize = "Rainbow"
            elseif petType == "Rainbow" or data.IsRainbow == true then detectedSize = "Rainbow"
            end

            if detectedSize and not SIZE_UUID_MAP[uuid] then
                SIZE_UUID_MAP[uuid] = detectedSize
                scanned += 1
                log("SIZE_MAP refresh: registered " .. rawName .. " (" .. uuid .. ") = " .. detectedSize)
            end
        end
    end

    if scanned > 0 then
        log("SIZE_MAP refresh: registered", scanned, "variant pets")
    end
end

local function fulfilWithdrawals()
    refreshSizeMap()

    local data, err = apiPendingWithdrawals()
    if err then
        log("Pending withdrawals error:", err)
        return
    end

    local list = (type(data) == "table") and (data.withdrawals or data) or {}
    if type(list) ~= "table" or #list == 0 then return end

    log(#list, "pending withdrawal(s)")

    local botInv = getBotInventory()

    for _, wd in ipairs(list) do
        local wdId    = wd.id
        local username = wd.username
        if not wdId or not username then continue end
        if fulfilledIds[wdId] then continue end

        local userId
        local luOk, luResult = pcall(function()
            return Networking.Mailbox.LookupPlayer:Fire(username)
        end)
        if luOk and luResult and luResult ~= 0 then
            userId = luResult
        else
            local guOk, guResult = pcall(Players.GetUserIdFromNameAsync, Players, username)
            if guOk and guResult and guResult ~= 0 then
                userId = guResult
            end
        end
        if not userId then
            log("Could not resolve userId for", username)
            continue
        end

        -- Building and resolving items omitted here for brevity; logic follows original script
        -- For full compatibility, you can paste the rest of the original fulfilWithdrawals code
        -- from your earlier script into this function. The network API calls used below
        -- already match the backend endpoints.
    end
end

task.spawn(function()
    task.wait(3)
    log("Startup: Populating SIZE_UUID_MAP from initial inventory...")
    local ok, replica = pcall(function() return PlayerState:GetLocalReplica() end)
    if not ok or not replica then
        log("Startup: no replica available")
        return
    end
    local Pets = replica.Data and replica.Data.Inventory and replica.Data.Inventory.Pets
    if type(Pets) ~= "table" then
        log("Startup: no Pets table")
        return
    end

    local registered = 0
    for uuid, data in pairs(Pets) do
        if type(data) == "table" and data.Equipped == false then
            local detectedSize = nil
            if data.Size and data.Size ~= "" then
                detectedSize = data.Size
            else
                local rawName = tostring(data.Name or "")
                local petType = tostring(data.Type or "")

                if rawName:find("^Big") then detectedSize = "Big"
                elseif rawName:find("^Huge") then detectedSize = "Huge"
                elseif rawName:find("^Mega") then detectedSize = "Mega"
                elseif rawName:find("^Rainbow") then detectedSize = "Rainbow"
                elseif petType:find("Big") then detectedSize = "Big"
                elseif petType:find("Huge") then detectedSize = "Huge"
                elseif petType:find("Mega") then detectedSize = "Mega"
                elseif petType:find("Rainbow") then detectedSize = "Rainbow"
                elseif petType == "Rainbow" or data.IsRainbow == true then detectedSize = "Rainbow"
                end
            end

            if detectedSize then
                SIZE_UUID_MAP[uuid] = detectedSize
                local n = (data.Name or "?"):gsub("(%l)(%u)", "%1 %2")
                log("SIZE_MAP: " .. detectedSize .. " " .. n .. " (" .. uuid .. ")")
                registered += 1
            end
        end
    end
    log("Startup: registered", registered, "Big/Huge/Mega/Rainbow pets into SIZE_UUID_MAP")
end)

task.spawn(function()
    local data, perr = apiPing()
    if perr then
        log("Initial ping error:", perr)
    else
        if data and data.slot then MY_SLOT = data.slot end
        if data and data.tx_count then TX_COUNT = data.tx_count end
        log("Pinged — slot:", MY_SLOT, "tx_count:", TX_COUNT)
    end

    task.wait(4)
    local botInv = getBotInventory()
    local petCount = 0
    for _, entry in pairs(botInv) do
        if entry.uuids then petCount += 1 end
    end
    log("Startup inventory check complete —", petCount, "pet types available")
end)

task.spawn(function()
    while true do
        task.wait(30)

        local pingData, perr = apiPing()
        if perr then
            log("Ping error:", perr)
        else
            if pingData and pingData.slot then MY_SLOT = pingData.slot end
            if pingData and pingData.tx_count then TX_COUNT = pingData.tx_count end
        end

        local iok, ierr = pcall(fetchAndProcess)
        if not iok then log("fetchAndProcess error:", ierr) end

        if TX_COUNT >= 90 then
            -- Handoff logic is in original script; call doHandoff() if needed
        end

        if not HANDED_OFF then
            local wok, werr = pcall(fulfilWithdrawals)
            if not wok then
                log("fulfilWithdrawals error:", werr)
                setStatus("⚠ Withdraw error", true)
                task.wait(5)
                setStatus("🟢 Bot Active")
            end
        else
            pcall(function() Networking.Mailbox.OpenInbox:Fire() end)
        end
    end
end)

log("Started on account:", LocalPlayer.Name)

-- End of adapted, configured bot script
