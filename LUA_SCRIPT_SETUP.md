# Lua Deposit Bot - Setup Guide

## Endpoint Integration

The Lua bot in this repo is configured to use the bot API routes, not the `/api/deposit` endpoint.

### Endpoint Details
- **Base URL**: `https://bloxygag.org` (production) or your local backend URL
- **Deposit**: `POST /bot/deposit`
- **Pending withdrawals**: `GET /bot/pending-withdrawals`
- **Complete withdrawal**: `POST /admin/withdrawals/complete`
- **Ping**: `POST /bot/gag/ping`
- **Tx complete**: `POST /bot/gag/tx-complete`
- **Next bot**: `GET /bot/gag/next-bot?exclude_slot=<n>`

### Expected Deposit Payload Format
```json
{
  "roblox_username": "string",
  "items": [
    { "name": "Golden Dragonfly", "qty": 1 },
    { "name": "Corn Seed", "qty": 5 }
  ],
  "bot_username": "Growagarden2Roflips"
}
```

### Configuration Update

In your Lua script, set the website URL to the production domain:

```lua
local BASE = "https://bloxygag.org"
```

If you run the backend locally, use:

```lua
local BASE = "http://127.0.0.1:3218"
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
