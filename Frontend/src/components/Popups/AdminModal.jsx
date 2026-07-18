import { logoGradient } from "../../assets/imageExport";
import PropTypes from "prop-types";
import "./AdminModal.css";
import { m } from "framer-motion";
import { useState, useEffect, useContext } from "react";
import { resolvePetImage } from "../../utils/image";
import { toast } from "react-hot-toast";
import UserContext from "../../utils/UserContext";
import { isAdminUser } from "../../utils/adminUtils";
import { getJWT, setJWT } from "../../utils/api";
import config from "../../config";

export default function AdminModal({ closeModal }) {
  const activeUser = useContext(UserContext);
  const [activeSection, setActiveSection] = useState("stats");
  const [bannedUsers, setBannedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [banInput, setBanInput] = useState("");
  const [muteInput, setMuteInput] = useState("");
  const [spawnUser, setSpawnUser] = useState("");
  const [spawnItem, setSpawnItem] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDisplayName, setNewItemDisplayName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [newItemGame, setNewItemGame] = useState("GAG2");
  const [newItemType, setNewItemType] = useState("pet");
  const [newItemImage, setNewItemImage] = useState("");
  const [giveawayItem, setGiveawayItem] = useState("");
  const [giveawayDurationMinutes, setGiveawayDurationMinutes] = useState(30);
  const [botUsernames, setBotUsernames] = useState([]);
  const [newBotUsername, setNewBotUsername] = useState("");
  const [botsLoading, setBotsLoading] = useState(true);
  const [impersonateUser, setImpersonateUser] = useState("");
  const [logsUser, setLogsUser] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoType, setPromoType] = useState("item");
  const [promoTargetUser, setPromoTargetUser] = useState("");
  const [promoItem, setPromoItem] = useState("");
  const [promoUses, setPromoUses] = useState("");
  const [promoQuantity, setPromoQuantity] = useState("");
  const [availableItems, setAvailableItems] = useState([]);
  const [availableItemsError, setAvailableItemsError] = useState("");
  const [availableItemsCount, setAvailableItemsCount] = useState(0);
  const [activeGiveaways, setActiveGiveaways] = useState([]);
  const [withdrawals, setWithdrawals] = useState({ pending: [], manual: [], all: [] });
  const [coinflipStats, setCoinflipStats] = useState({ currentActive: 0, totalGames: 0, totalValue: 0 });
  const [activePromos, setActivePromos] = useState([]);
  const [taxedItems, setTaxedItems] = useState([]);
  const [taxDeleteQuantities, setTaxDeleteQuantities] = useState({});
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const isAllowedAdmin = isAdminUser(
    activeUser?.originalUsername || activeUser?.username || "",
    activeUser?.rank
  );

  const availableItemsFiltered = availableItems.filter((item) => {
    const isHugeCatPS99 = item?.game?.toLowerCase?.()?.includes("ps99") && item?.item_name?.toLowerCase?.()?.includes("huge cat");
    return !isHugeCatPS99;
  });

  const loadAvailableItems = async (token) => {
    try {
      const itemsRes = await fetch(`${config.api}/admin/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!itemsRes.ok) {
        const errText = await itemsRes.text().catch(() => "");
        setAvailableItemsError(
          `Failed to load admin items: ${itemsRes.status}${errText ? ` - ${errText}` : ""}`
        );
        setAvailableItems([]);
        setAvailableItemsCount(0);
        console.warn('Failed to load items for admin', itemsRes.status, errText);
        return;
      }

      const itemsData = await itemsRes.json();
      const items = itemsData.items || [];
      setAvailableItems(items);
      setAvailableItemsCount(items.length);
      setAvailableItemsError("");
      console.debug('Admin items loaded', {
        total: items.length,
        sample: items.slice(0, 10).map((i) => ({ item_name: i.item_name, game: i.game })),
      });
    } catch (e) {
      setAvailableItemsError(`Failed to load admin items: ${e.message || e}`);
      setAvailableItems([]);
      setAvailableItemsCount(0);
      console.warn('Failed to load items for admin', e.message || e);
    }
  };

  const sections = {
    stats: {
      title: "Statistics",
      description: "View game and user statistics.",
      icon: "📊",
    },
    promo: {
      title: "Promo Codes",
      description: "Generate promo codes for items or balance rewards.",
      icon: "🏷️",
    },
    giveaways: {
      title: "Giveaways",
      description: "Create and monitor giveaways using available items.",
      icon: "🎁",
    },
    moderation: {
      title: "Moderation",
      description: "Ban or mute users to block games, chat, deposits, and withdrawals.",
      icon: "🚫",
    },
    items: {
      title: "Item Control",
      description: "Spawn items or pets into a user inventory.",
      icon: "🧩",
    },
    withdrawals: {
      title: "Withdrawals",
      description: "View and complete pending or manual withdrawals.",
      icon: "📤",
    },
    bots: {
      title: "Bot Accounts",
      description: "Add or remove GAG2 bot usernames for deposit accounts.",
      icon: "🤖",
    },
    tax: {
      title: "Taxed Items",
      description: "View taxed items and pets held by the tax account.",
      icon: "🧾",
    },
    logs: {
      title: "User Logs",
      description: "View action history for a specific user.",
      icon: "📝",
    },
    events: {
      title: "Events",
      description: "Create and manage wager events with leaderboards.",
      icon: "🎉",
    },
    settings: {
      title: "Settings",
      description: "Configure admin panel settings.",
      icon: "⚙️",
    },
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getJWT();
        
        // Load promo codes
        const promoRes = await fetch(`${config.api}/promo-codes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const promoData = await promoRes.json();
        if (promoRes.ok && promoData?.promos) {
          setActivePromos(promoData.promos);
        }

        // Load available items for admin tools
        await loadAvailableItems(token);

        // Load active giveaways
        try {
          const giveawaysRes = await fetch(`${config.api}/giveaways`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (giveawaysRes.ok) {
            const giveawaysData = await giveawaysRes.json();
            setActiveGiveaways(giveawaysData.newGiveaways || []);
          }
        } catch (e) {
          console.warn('Failed to load giveaways for admin', e.message);
        }

        // Load withdrawals
        try {
          const wRes = await fetch(`${config.api}/admin/withdrawals`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (wRes.ok) {
            const wData = await wRes.json();
            setWithdrawals(wData || { pending: [], manual: [], all: [] });
          }
        } catch (e) {
          console.warn('Failed to load withdrawals for admin', e.message);
        }

        const statsRes = await fetch(`${config.api}/coinflips`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.currentStats) {
            setCoinflipStats(statsData.currentStats);
          }
        }
        
        // Load banned users from backend
        const bannedRes = await fetch(`${config.api}/disciplinary/banned`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (bannedRes.ok) {
          const bannedData = await bannedRes.json();
          setBannedUsers(bannedData.banned || []);
          saveLocal("bannedUsers", bannedData.banned || []);
        }
        
        // Load muted users from backend
        const mutedRes = await fetch(`${config.api}/disciplinary/muted`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (mutedRes.ok) {
          const mutedData = await mutedRes.json();
          setMutedUsers(mutedData.muted || []);
          saveLocal("mutedUsers", mutedData.muted || []);
        }

        // Load GAG2 deposit bot accounts
        try {
          const botsRes = await fetch(`${config.api}/cashier/bots/gag2`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (botsRes.ok) {
            const botsData = await botsRes.json();
            setBotUsernames(Array.isArray(botsData) ? botsData : botsData?.bots || []);
          }
        } catch (e) {
          console.warn('Failed to load GAG2 bot accounts', e.message);
        }

        try {
          await refreshTaxedItems();
        } catch (error) {
          console.warn('Failed to load taxed items', error.message || error);
        }
      } catch (error) {
        console.error("Failed to load admin data", error);
        // Fallback to localStorage if backend fails
        const savedBans = localStorage.getItem("bannedUsers");
        if (savedBans) {
          setBannedUsers(JSON.parse(savedBans));
        }
        const savedMutes = localStorage.getItem("mutedUsers");
        if (savedMutes) {
          setMutedUsers(JSON.parse(savedMutes));
        }
      } finally {
        setBotsLoading(false);
      }
    };

    loadData();

    const savedLogs = localStorage.getItem("userLogs");
    if (savedLogs) {
      setUserLogs(JSON.parse(savedLogs));
    }
  }, []);

  useEffect(() => {
    if (activeSection === "items" || activeSection === "promo" || activeSection === "giveaways") {
      const token = getJWT();
      if (token) loadAvailableItems(token);
    }
  }, [activeSection]);

  const saveLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const addLog = (entry) => {
    const logs = JSON.parse(localStorage.getItem("userLogs") || "[]");
    const nextLogs = [entry, ...logs];
    setUserLogs(nextLogs);
    saveLocal("userLogs", nextLogs);
  };

  const handleBanUser = async () => {
    if (!banInput.trim()) return;
    const username = banInput.trim().toLowerCase();
    if (bannedUsers.includes(username)) {
      return toast.error(`${username} is already banned.`);
    }
    
    try {
      const response = await fetch(`${config.api}/disciplinary/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to ban user");
      }
      
      const updated = [...bannedUsers, username];
      setBannedUsers(updated);
      saveLocal("bannedUsers", updated);
      addLog({
        id: Date.now(),
        action: "ban",
        username,
        time: new Date().toISOString(),
      });
      setBanInput("");
      toast.success(`${username} has been banned.`);
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
    }
  };

  const refreshBotUsernames = async () => {
    try {
      setBotsLoading(true);
      const response = await fetch(`${config.api}/cashier/bots/gag2`, {
        headers: {
          Authorization: `Bearer ${getJWT()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBotUsernames(Array.isArray(data) ? data : data?.bots || []);
      }
    } catch (error) {
      console.error('Failed to refresh GAG2 bot usernames:', error);
      toast.error('Could not refresh bot accounts');
    } finally {
      setBotsLoading(false);
    }
  };

  const handleAddBotUsername = async () => {
    if (!newBotUsername.trim()) {
      return toast.error('Enter a bot username first.');
    }

    const username = newBotUsername.trim().toLowerCase();
    if (botUsernames.some((bot) => bot.username?.toLowerCase() === username)) {
      return toast.error(`${username} is already added.`);
    }

    try {
      const response = await fetch(`${config.api}/cashier/bots/gag2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        data = { success: false, message: text || 'Unexpected server response' };
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to add bot account');
      }
      setNewBotUsername('');
      addLog({ id: Date.now(), action: 'bot_add', username, time: new Date().toISOString() });
      await refreshBotUsernames();
      toast.success(`Added bot account ${username}.`);
    } catch (error) {
      console.error('Error adding bot username:', error);
      toast.error(error.message || 'Failed to add bot account');
    }
  };

  const handleRemoveBotUsername = async (id) => {
    try {
      const response = await fetch(`${config.api}/cashier/bots/gag2/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getJWT()}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to remove bot account');
      }
      addLog({ id: Date.now(), action: 'bot_remove', botId: id, time: new Date().toISOString() });
      await refreshBotUsernames();
      toast.success('Removed bot account.');
    } catch (error) {
      console.error('Error removing bot username:', error);
      toast.error(error.message || 'Failed to remove bot account');
    }
  };

  const handleToggleBotStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Online' ? 'Offline' : 'Online';
    try {
      const response = await fetch(`${config.api}/cashier/bots/gag2/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Failed to set status ${nextStatus}`);
      }
      addLog({ id: Date.now(), action: 'bot_status', botId: id, status: nextStatus, time: new Date().toISOString() });
      await refreshBotUsernames();
      toast.success(`Set bot status to ${nextStatus}.`);
    } catch (error) {
      console.error('Error toggling bot status:', error);
      toast.error(error.message || 'Failed to update bot status');
    }
  };

  const handleUnbanUser = async (username) => {
    try {
      const response = await fetch(`${config.api}/disciplinary/unban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to unban user");
      }
      
      const updated = bannedUsers.filter((u) => u !== username);
      setBannedUsers(updated);
      saveLocal("bannedUsers", updated);
      addLog({
        id: Date.now(),
        action: "unban",
        username,
        time: new Date().toISOString(),
      });
      toast.success(`${username} has been unbanned.`);
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
    }
  };

  const handleMuteUser = async () => {
    if (!muteInput.trim()) return;
    const username = muteInput.trim().toLowerCase();
    if (mutedUsers.includes(username)) {
      return toast.error(`${username} is already muted.`);
    }
    
    try {
      const response = await fetch(`${config.api}/disciplinary/mute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to mute user");
      }
      
      const updated = [...mutedUsers, username];
      setMutedUsers(updated);
      saveLocal("mutedUsers", updated);
      addLog({
        id: Date.now(),
        action: "mute",
        username,
        time: new Date().toISOString(),
      });
      setMuteInput("");
      toast.success(`${username} has been muted.`);
    } catch (error) {
      console.error("Error muting user:", error);
      toast.error("Failed to mute user");
    }
  };

  const handleUnmuteUser = async (username) => {
    try {
      const response = await fetch(`${config.api}/disciplinary/unmute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to unmute user");
      }
      
      const updated = mutedUsers.filter((u) => u !== username);
      setMutedUsers(updated);
      saveLocal("mutedUsers", updated);
      addLog({
        id: Date.now(),
        action: "unmute",
        username,
        time: new Date().toISOString(),
      });
      toast.success(`${username} has been unmuted.`);
    } catch (error) {
      console.error("Error unmuting user:", error);
      toast.error("Failed to unmute user");
    }
  };

  const handleSpawnItem = async () => {
    if (!spawnUser.trim() || !spawnItem) {
      return toast.error("Provide both target username and item.");
    }

    try {
      const username = spawnUser.trim().toLowerCase();
      const response = await fetch(`${config.api}/admin/spawn-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJWT()}` },
        body: JSON.stringify({ username, itemId: spawnItem }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Spawn failed');
      }
      addLog({ id: Date.now(), action: 'spawn_item', username, item: data.inventory._id, time: new Date().toISOString() });
      setSpawnItem('');
      toast.success(`Spawned item into ${username}'s inventory.`);
    } catch (err) {
      console.error('Spawn failed', err);
      toast.error(err.message || 'Failed to spawn item');
    }
  };

  const handleResetInventory = async () => {
    if (!spawnUser.trim()) {
      return toast.error("Provide a target username to reset inventory.");
    }

    try {
      const username = spawnUser.trim().toLowerCase();
      const response = await fetch(`${config.api}/admin/reset-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJWT()}` },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Reset failed');
      }
      addLog({ id: Date.now(), action: 'reset_inventory', username, deletedCount: data.deletedCount, time: new Date().toISOString() });
      toast.success(`Reset inventory for ${username}. Removed ${data.deletedCount || 0} item(s).`);
    } catch (err) {
      console.error('Reset inventory failed', err);
      toast.error(err.message || 'Failed to reset inventory');
    }
  };

  const handleCreateAdminItem = async () => {
    if (!newItemName.trim()) {
      return toast.error('Enter a pet or item name first.');
    }

    try {
      const response = await fetch(`${config.api}/admin/items/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJWT()}` },
        body: JSON.stringify({
          name: newItemName.trim(),
          displayName: newItemDisplayName.trim() || newItemName.trim(),
          itemValue: newItemValue.trim() || '0',
          game: newItemGame.trim() || 'GAG2',
          itemType: newItemType.trim() || 'pet',
          itemImage: newItemImage.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create item');
      }
      addLog({ id: Date.now(), action: 'item_create', item: data.item?.item_name || newItemName.trim(), time: new Date().toISOString() });
      setNewItemName('');
      setNewItemDisplayName('');
      setNewItemValue('');
      setNewItemGame('GAG2');
      setNewItemType('pet');
      setNewItemImage('');
      await loadAvailableItems(getJWT());
      toast.success(`Created ${data.item?.item_name || 'new item'}.`);
    } catch (err) {
      console.error('Create item failed', err);
      toast.error(err.message || 'Failed to create item');
    }
  };

  const refreshGiveaways = async () => {
    try {
      const response = await fetch(`${config.api}/giveaways`, {
        headers: { Authorization: `Bearer ${getJWT()}` },
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setActiveGiveaways(data.newGiveaways || []);
    } catch (err) {
      console.warn('Failed to refresh giveaways', err.message || err);
    }
  };

  const refreshTaxedItems = async () => {
    try {
      const response = await fetch(`${config.api}/admin/tax-items`, {
        headers: { Authorization: `Bearer ${getJWT()}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'Failed to load taxed items');
      }
      setTaxedItems(data.taxedItems || []);
      setTaxDeleteQuantities((prev) => {
        const next = { ...prev };
        (data.taxedItems || []).forEach((item) => {
          const key = `${item.itemName}||${item.game}`;
          if (!next[key]) next[key] = 1;
        });
        return next;
      });
    } catch (error) {
      console.warn('Failed to refresh taxed items', error.message || error);
      throw error;
    }
  };

  const handleDeleteTaxedItems = async (itemName, game) => {
    try {
      const key = `${itemName}||${game}`;
      const quantity = Number(taxDeleteQuantities[key] || 1);
      if (!itemName || quantity < 1) {
        return toast.error('Invalid delete quantity');
      }
      const response = await fetch(`${config.api}/admin/tax-items/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ itemName, quantity, game }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'Failed to delete taxed items');
      }
      await refreshTaxedItems();
      setTaxDeleteQuantities((prev) => ({ ...prev, [key]: 1 }));
      addLog({
        id: Date.now(),
        action: 'tax_delete',
        itemName,
        game,
        quantity,
        time: new Date().toISOString(),
      });
      toast.success(`Deleted ${quantity} taxed item(s) from ${itemName}.`);
    } catch (error) {
      console.error('Failed to delete taxed items', error);
      toast.error(error.message || 'Failed to delete taxed items');
    }
  };

  const handleCreateGiveaway = async () => {
    if (!giveawayItem) return toast.error('Choose an item to create giveaway');
    if (!giveawayDurationMinutes || giveawayDurationMinutes < 1) {
      return toast.error('Giveaway duration must be at least 1 minute');
    }

    try {
      const response = await fetch(`${config.api}/admin/create-giveaway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJWT()}` },
        body: JSON.stringify({
          itemId: giveawayItem,
          durationMs: Number(giveawayDurationMinutes) * 60000,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Create giveaway failed');
      }
      addLog({ id: Date.now(), action: 'giveaway_create', item: giveawayItem, time: new Date().toISOString() });
      setGiveawayItem('');
      toast.success('Giveaway created.');
      refreshGiveaways();
    } catch (err) {
      console.error('Create giveaway failed', err);
      toast.error(err.message || 'Failed to create giveaway');
    }
  };

  const handleCompleteWithdrawal = async (id) => {
    try {
      const response = await fetch(`${config.api}/admin/withdrawals/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJWT()}` },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to complete withdrawal');
      toast.success('Marked withdrawal as completed.');
      // refresh list
      const wRes = await fetch(`${config.api}/admin/withdrawals`, { headers: { Authorization: `Bearer ${getJWT()}` } });
      if (wRes.ok) setWithdrawals((await wRes.json()) || { pending: [], manual: [], all: [] });
    } catch (err) {
      console.error('Complete withdrawal failed', err);
      toast.error(err.message || 'Failed to complete withdrawal');
    }
  };

  const handleImpersonateUser = async () => {
    if (!impersonateUser.trim()) {
      return toast.error("Provide a username to impersonate.");
    }

    const username = impersonateUser.trim().toLowerCase();

    try {
      const response = await fetch(`${config.api}/admin/impersonate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({ username }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        data = await response.text();
      }

      if (!response.ok) {
        const message =
          typeof data === "string"
            ? data
            : data?.message || data?.error || "Failed to impersonate user";
        throw new Error(message);
      }

      const authToken =
        typeof data === "string"
          ? data
          : data?.token || data?.data?.token || null;
      if (!authToken) {
        console.error("Invalid impersonation response:", data);
        throw new Error("Invalid token received from impersonation endpoint");
      }

      setJWT(authToken);
      window.localStorage.removeItem("adminImpersonation");
      addLog({
        id: Date.now(),
        action: "impersonate",
        username,
        time: new Date().toISOString(),
      });
      setImpersonateUser("");
      toast.success(`Signed in as ${username}. Reloading the site...`);
      closeModal();
      window.location.reload();
    } catch (error) {
      console.error("Impersonation failed:", error);
      toast.error(error.message || "Failed to sign in as user.");
    }
  };

  const handleGenerateCode = async () => {
    const codeText = promoCode.trim() || `CODE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const targetUsername = promoTargetUser.trim() || null;
    const isItemCode = promoType === "item";

    if (isItemCode && !promoItem.trim()) {
      return toast.error("Select an item for this promo code.");
    }

    if (!isItemCode && !promoQuantity.trim()) {
      return toast.error("Enter a value for this balance promo code.");
    }

    try {
      const response = await fetch(`${config.api}/promo-codes/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({
          code: codeText,
          targetUsername,
          itemName: isItemCode ? promoItem.trim() : null,
          usesRemaining: Number(promoUses || 1),
          rewardValue: Number(promoQuantity || (isItemCode ? 1 : 1)),
          rewardType: isItemCode ? "item" : "balance",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to create code");
      }

      setActivePromos((prev) => [data.promo, ...prev]);
      addLog({
        id: Date.now(),
        action: "code_generated",
        code: codeText,
        item: promoItem.trim() || null,
        targetUsername,
        time: new Date().toISOString(),
      });
      setPromoCode("");
      setPromoItem("");
      setPromoTargetUser("");
      setPromoUses("");
      setPromoQuantity("");
      toast.success(`Generated code ${codeText}. It can be redeemed until uses run out.`);
    } catch (error) {
      toast.error(error.message || "Failed to generate code.");
    }
  };

  const handleDeletePromoCode = async (code) => {
    try {
      const response = await fetch(`${config.api}/promo-codes/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getJWT()}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete promo code");
      }

      const refreshed = await fetch(`${config.api}/promo-codes`, {
        headers: {
          Authorization: `Bearer ${getJWT()}`,
        },
      });
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok && refreshedData?.promos) {
        setActivePromos(refreshedData.promos);
      }

      addLog({
        id: Date.now(),
        action: "code_deleted",
        code,
        time: new Date().toISOString(),
      });
      toast.success(`Deleted promo code ${code}.`);
    } catch (error) {
      toast.error(error.message || "Failed to delete promo code.");
    }
  };

  const handleCreateEvent = async () => {
    if (!eventDurationMinutes || eventDurationMinutes <= 0) {
      return toast.error("Event duration must be greater than 0");
    }

    try {
      const response = await fetch(`${config.api}/event/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJWT()}`,
        },
        body: JSON.stringify({
          durationMinutes: parseInt(eventDurationMinutes),
          name: "Wager Event",
          description: "Compete on the leaderboard by wagering items!",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return toast.error(data.message || "Failed to create event");
      }

      addLog({
        id: Date.now(),
        action: "event_created",
        code: "event",
        time: new Date().toISOString(),
      });

      toast.success(`Event created for ${eventDurationMinutes} minutes!`);
      setEventDurationMinutes(60);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  if (!isAllowedAdmin) {
    return null;
  }

  const filteredLogs = logsUser.trim()
    ? userLogs.filter((log) => log.username === logsUser.trim().toLowerCase())
    : userLogs;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={() => closeModal()}
    >
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="AdminModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="Header">
          <img src={logoGradient} alt="BloxyGAG Logo" />
          <h1>Admin Panel</h1>
        </div>
        <div className="AdminContainer">
          <div className="SideMenu">
            {Object.entries(sections).map(([key, section]) => (
              <div
                key={key}
                className={`MenuItem ${activeSection === key ? "Active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                <span className="Icon">{section.icon}</span>
                <span className="Label">{section.title}</span>
              </div>
            ))}
          </div>
          <div className="Content">
            <div className="AdminSection">
              <div className="SectionHeader">
                <span className="SectionIcon">{sections[activeSection].icon}</span>
                <h2>{sections[activeSection].title}</h2>
              </div>
              <p className="Description">{sections[activeSection].description}</p>
              
              {activeSection === "stats" && (
                <div className="SectionContent StatsGrid">
                  <div className="StatCard">
                    <h3>Total Coinflip Games</h3>
                    <p>{coinflipStats.totalGames.toLocaleString()}</p>
                  </div>
                  <div className="StatCard">
                    <h3>Total Coinflip Value</h3>
                    <p>{coinflipStats.totalValue.toLocaleString()}</p>
                  </div>
                  <div className="StatCard">
                    <h3>Active Coinflips</h3>
                    <p>{coinflipStats.currentActive.toLocaleString()}</p>
                  </div>
                  <div className="StatCard">
                    <h3>Ban Count</h3>
                    <p>{bannedUsers.length.toLocaleString()}</p>
                  </div>
                  <div className="StatCard">
                    <h3>Muted Users</h3>
                    <p>{mutedUsers.length.toLocaleString()}</p>
                  </div>
                  <div className="StatCard">
                    <h3>Recent Actions</h3>
                    <p>{userLogs.length.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {activeSection === "promo" && (
                <div className="SectionContent">
                  <div className="ActionRow">
                    <div className="ActionGroup">
                      <h3>Code Maker</h3>
                      <input
                        type="text"
                        placeholder="Promo code (optional)"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Target username (optional)"
                        value={promoTargetUser}
                        onChange={(e) => setPromoTargetUser(e.target.value)}
                      />
                      <select value={promoType} onChange={(e) => setPromoType(e.target.value)}>
                        <option value="item">Item Reward</option>
                        <option value="balance">Balance Reward</option>
                      </select>
                      {promoType === "item" && (
                        <>
                          <select value={promoItem} onChange={(e) => setPromoItem(e.target.value)}>
                            <option value="">Select item or pet</option>
                            {availableItemsFiltered.map((item) => (
                              <option key={item._id} value={item.item_name}>
                                {item.display_name || item.item_name} {item.game ? `(${item.game})` : ''}
                              </option>
                            ))}
                          </select>
                          {availableItemsError && <p className="NoUsers">{availableItemsError}</p>}
                        </>
                      )}
                      <input
                        type="number"
                        min="1"
                        placeholder="Uses"
                        value={promoUses}
                        onChange={(e) => setPromoUses(e.target.value)}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder={promoType === "item" ? "Items per redeem" : "Balance amount"}
                        value={promoQuantity}
                        onChange={(e) => setPromoQuantity(e.target.value)}
                      />
                      <button onClick={handleGenerateCode}>Generate Code</button>
                      <div className="UsersList">
                        {activePromos.length === 0 ? (
                          <p className="NoUsers">No promo codes yet</p>
                        ) : (
                          activePromos.slice(0, 10).map((promo) => (
                            <div key={promo._id || promo.code} className="PromoCodeCard">
                              <div className="PromoCodeMain">
                                <div className="PromoCodeName">{promo.code}</div>
                                <div className="PromoCodeMeta">Uses: {promo.usesRemaining}/{promo.maxUses}</div>
                                <div className="PromoCodeMeta">Qty: {promo.rewardValue || 1}</div>
                                <div className="PromoCodeMeta">Type: {promo.rewardType || 'item'}</div>
                                <div className="PromoCodeMeta">Item: {promo.itemName || '—'}</div>
                                {promo.targetUsername && (
                                  <div className="PromoCodeMeta">Target: {promo.targetUsername}</div>
                                )}
                              </div>
                              <button className="PromoDeleteBtn" onClick={() => handleDeletePromoCode(promo.code)}>
                                Delete
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "moderation" && (
                <div className="BanManagement">
                  <div className="BanInput">
                    <input
                      type="text"
                      placeholder="Enter Roblox username to ban..."
                      value={banInput}
                      onChange={(e) => setBanInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleBanUser()}
                    />
                    <button onClick={handleBanUser}>Ban User</button>
                  </div>
                  <div className="BanInput">
                    <input
                      type="text"
                      placeholder="Enter Roblox username to mute..."
                      value={muteInput}
                      onChange={(e) => setMuteInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleMuteUser()}
                    />
                    <button onClick={handleMuteUser}>Mute User</button>
                  </div>
                  <div className="BannedList">
                    <h3>Currently Banned Users ({bannedUsers.length})</h3>
                    {bannedUsers.length === 0 ? (
                      <p className="NoUsers">No banned users</p>
                    ) : (
                      <div className="UsersList">
                        {bannedUsers.map((username) => (
                          <div key={username} className="BannedUser">
                            <span className="Username">{username}</span>
                            <button
                              className="UnbanBtn"
                              onClick={() => handleUnbanUser(username)}
                            >
                              Unban
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="BannedList">
                    <h3>Currently Muted Users ({mutedUsers.length})</h3>
                    {mutedUsers.length === 0 ? (
                      <p className="NoUsers">No muted users</p>
                    ) : (
                      <div className="UsersList">
                        {mutedUsers.map((username) => (
                          <div key={username} className="BannedUser">
                            <span className="Username">{username}</span>
                            <button
                              className="UnbanBtn"
                              onClick={() => handleUnmuteUser(username)}
                            >
                              Unmute
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "withdrawals" && (
                <div className="SectionContent">
                  <h3>Pending Withdrawals ({withdrawals.pending.length})</h3>
                  {withdrawals.pending.length === 0 ? (
                    <p className="NoUsers">No pending withdrawals</p>
                  ) : (
                    <div className="UsersList">
                      {withdrawals.pending.map((w) => (
                        <div key={w.id} className="BannedUser">
                          <span className="Username">{w.robloxId} — {w.item_name}</span>
                          <button className="UnbanBtn" onClick={() => handleCompleteWithdrawal(w.id)}>Complete</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <h3>Manual Withdrawals ({withdrawals.manual.length})</h3>
                  {withdrawals.manual.length === 0 ? (
                    <p className="NoUsers">No manual withdrawals</p>
                  ) : (
                    <div className="UsersList">
                      {withdrawals.manual.map((w) => (
                        <div key={w.id} className="BannedUser">
                          <span className="Username">{w.robloxId} — {w.item_name}</span>
                          <button className="UnbanBtn" onClick={() => handleCompleteWithdrawal(w.id)}>Mark Completed</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "bots" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>GAG2 Deposit Bot Accounts</h3>
                    <div className="BanInput">
                      <input
                        type="text"
                        placeholder="New bot username"
                        value={newBotUsername}
                        onChange={(e) => setNewBotUsername(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddBotUsername()}
                      />
                      <button onClick={handleAddBotUsername}>Add Bot</button>
                    </div>
                    {botsLoading ? (
                      <p className="NoUsers">Loading bot accounts...</p>
                    ) : botUsernames.length === 0 ? (
                      <p className="NoUsers">No GAG2 bot accounts configured yet.</p>
                    ) : (
                      <div className="UsersList">
                        {botUsernames.map((bot) => {
                          const status = bot.status === 'Online' ? 'Online' : 'Offline';
                          const isOnline = status === 'Online';
                          return (
                            <div key={bot._id} className="BannedUser">
                              <div className="BotStatusRow">
                                <span className={`StatusDot ${status}`} />
                                <span className="Username">{bot.username}</span>
                                <span className={`StatusLabel ${status}`}>{status}</span>
                              </div>
                              <div className="BotActions">
                                <button
                                  className="StatusToggleBtn"
                                  onClick={() => handleToggleBotStatus(bot._id, status)}
                                >
                                  {isOnline ? 'Set Offline' : 'Set Online'}
                                </button>
                                <button className="UnbanBtn" onClick={() => handleRemoveBotUsername(bot._id)}>
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "items" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Create New Pet / Item</h3>
                    <input
                      type="text"
                      placeholder="Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Display name"
                      value={newItemDisplayName}
                      onChange={(e) => setNewItemDisplayName(e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Value"
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Game (default GAG2)"
                      value={newItemGame}
                      onChange={(e) => setNewItemGame(e.target.value)}
                    />
                    <select value={newItemType} onChange={(e) => setNewItemType(e.target.value)}>
                      <option value="pet">Pet</option>
                      <option value="seed">Seed</option>
                      <option value="item">Item</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={newItemImage}
                      onChange={(e) => setNewItemImage(e.target.value)}
                    />
                    <button onClick={handleCreateAdminItem}>Create Item</button>
                  </div>
                  <div className="ActionGroup">
                    <h3>Spawn Item</h3>
                    <input
                      type="text"
                      placeholder="Target username"
                      value={spawnUser}
                      onChange={(e) => setSpawnUser(e.target.value)}
                    />
                    <select value={spawnItem} onChange={(e) => setSpawnItem(e.target.value)}>
                      <option value="">Select item to spawn</option>
                      {availableItemsFiltered.map((it) => (
                        <option key={it._id} value={it._id}>{`${it.item_name} (${it.game || 'GAG2'})`}</option>
                      ))}
                    </select>
                    {availableItemsError ? (
                      <p className="NoUsers">{availableItemsError}</p>
                    ) : availableItemsFiltered.length === 0 ? (
                      <p className="NoUsers">No spawnable items loaded. Check backend item data or API response.</p>
                    ) : (
                      <p className="NoUsers">Loaded {availableItemsCount} admin items.</p>
                    )}
                    <button onClick={handleSpawnItem}>Spawn Item</button>
                    <button className="DangerBtn" onClick={handleResetInventory}>Reset Inventory</button>
                  </div>
                </div>
              )}

              {activeSection === "tax" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Taxed Items & Pets</h3>
                    {taxedItems.length === 0 ? (
                      <p className="NoUsers">No taxed items found.</p>
                    ) : (
                      <div className="UsersList">
                        {taxedItems.map((item) => {
                          const key = `${item.itemName}||${item.game}`;
                          return (
                            <div key={key} className="PromoCodeCard">
                              <div className="PromoCodeMain">
                                <div className="PromoIcon">
                                  <img
                                    src={resolvePetImage(item.image, item.itemName || item.name || item.display_name)}
                                    alt={item.itemName}
                                  />
                                </div>
                                <div className="PromoCodeName">{item.itemName}</div>
                                <div className="PromoCodeMeta">Game: {item.game || 'GAG2'}</div>
                                <div className="PromoCodeMeta">Type: {item.itemType}</div>
                                <div className="PromoCodeMeta">Count: {item.count}</div>
                                <div className="PromoCodeMeta">
                                  <label>
                                    Delete quantity:
                                    <input
                                      type="number"
                                      min="1"
                                      value={taxDeleteQuantities[key] || 1}
                                      onChange={(e) =>
                                        setTaxDeleteQuantities((prev) => ({
                                          ...prev,
                                          [key]: Number(e.target.value) || 1,
                                        }))
                                      }
                                    />
                                  </label>
                                </div>
                              </div>
                              <button className="PromoDeleteBtn" onClick={() => handleDeleteTaxedItems(item.itemName, item.game)}>
                                Delete Selected
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "giveaways" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Create Giveaway</h3>
                    <select value={giveawayItem} onChange={(e) => setGiveawayItem(e.target.value)}>
                      <option value="">Select item for giveaway</option>
                      {availableItemsFiltered.map((it) => (
                        <option key={it._id} value={it._id}>{`${it.item_name} (${it.game || 'GAG2'})`}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Duration (minutes)"
                      value={giveawayDurationMinutes}
                      onChange={(e) => setGiveawayDurationMinutes(e.target.value)}
                    />
                    <button onClick={handleCreateGiveaway}>Create Giveaway</button>
                  </div>
                  <div className="ActionGroup">
                    <h3>Active Giveaways</h3>
                    {activeGiveaways.length === 0 ? (
                      <p className="NoUsers">No active giveaways found</p>
                    ) : (
                      <div className="UsersList">
                        {activeGiveaways.slice(0, 12).map((giveaway) => (
                          <div key={giveaway._id || giveaway.item?._id} className="PromoCodeCard">
                            <div className="PromoCodeMain">
                              <div className="PromoCodeName">{giveaway.item?.item?.item_name || 'Unknown item'}</div>
                              <div className="PromoCodeMeta">Game: {giveaway.game || 'GAG2'}</div>
                              <div className="PromoCodeMeta">Ends: {new Date(giveaway.endsAt).toLocaleString()}</div>
                              <div className="PromoCodeMeta">Inactive: {giveaway.inactive ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "logs" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Logs of User</h3>
                    <input
                      type="text"
                      placeholder="Filter by username"
                      value={logsUser}
                      onChange={(e) => setLogsUser(e.target.value)}
                    />
                  </div>
                  {filteredLogs.length === 0 ? (
                    <p className="NoUsers">No matching logs</p>
                  ) : (
                    <div className="UsersList">
                      {filteredLogs.slice(0, 20).map((entry) => (
                        <div key={entry.id} className="BannedUser">
                          <span className="Username">
                            {entry.username || "system"}
                          </span>
                          <span className="Username">{entry.action}</span>
                          <span className="Username">{new Date(entry.time).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "events" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Create Wager Event</h3>
                    <label>
                      Event Duration (minutes):
                      <input
                        type="number"
                        min="1"
                        value={eventDurationMinutes}
                        onChange={(e) => setEventDurationMinutes(e.target.value)}
                        placeholder="60"
                      />
                    </label>
                    <div className="EventInfo">
                      <p>🥇 1st Place: 25 🐀 Raccoons</p>
                      <p>🥈 2nd Place: 12 🐀 Raccoons</p>
                      <p>🥉 3rd Place: 5 🐀 Raccoons</p>
                      <p>4th-10th Place: 50 🦄 Unicorns</p>
                    </div>
                    <button onClick={handleCreateEvent}>Create Event</button>
                  </div>
                </div>
              )}

              {activeSection === "settings" && (
                <div className="SectionContent">
                  <div className="ActionGroup">
                    <h3>Login As User</h3>
                    <div className="LoginRow">
                      <input
                        type="text"
                        placeholder="Username to impersonate"
                        value={impersonateUser}
                        onChange={(e) => setImpersonateUser(e.target.value)}
                      />
                      <button onClick={handleImpersonateUser}>Login as User</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

AdminModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
};
