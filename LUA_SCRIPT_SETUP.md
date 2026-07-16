# Lua Deposit Bot - Setup Guide

## Endpoint Integration

The Lua deposit bot has been successfully integrated with the website. The new endpoint is ready to accept deposits.

### Endpoint Details
- **URL**: `/api/deposit`
- **Method**: POST
- **Base URL**: `http://127.0.0.1:6565` (development) or your production domain

### Expected Payload Format
```json
{
  "roblox_id": "string (user's Roblox ID)",
  "pets": ["array", "of", "pet", "names"],
  "gems": 0
}
```

### Configuration Update

In your Lua script, update the website URL on line 1:

**Current:**
```lua
local website = "http://prem-eu3.bot-hosting.net:20414"
```

**Update to (Development):**
```lua
local website = "http://127.0.0.1:6565"
```

**Or (Production):**
```lua
local website = "https://bloxgag.org/api"
```

### How It Works

1. **Pet Processing**: 
   - Pets are cleaned of emoji/prefix formatting
   - Matched against Item database
   - Deposited to user's inventory

2. **Gem Processing**:
   - Gems are added to account balance
   - 1 gem = 1 currency unit (adjustable in controller)

3. **Response Format**:
```json
{
  "success": true,
  "message": "Deposit processed successfully",
  "deposited": {
    "pets": 5,
    "gems": 2500,
    "totalValue": 123.45
  },
  "failed": []
}
```

### Error Handling

- `400 Bad Request`: Missing roblox_id
- `404 Not Found`: User account not found in database
- `500 Internal Server Error`: Database or processing error

All deposits are logged to Discord webhook for monitoring.

### Testing the Endpoint

Use curl to test:
```bash
curl -X POST http://127.0.0.1:6565/api/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "roblox_id": "123456789",
    "pets": ["Golden Huge Cat", "✨ Rainbow Dragon"],
    "gems": 5000
  }'
```

## Files Modified

- ✅ Created: `Backend/controllers/payments/luaDepositController.js`
- ✅ Updated: `Backend/routes/index.js` (added import and route)

## Ready for Production

The Lua deposit system is now integrated and ready for deposits from your bot!
