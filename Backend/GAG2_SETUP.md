# GAG2 Casino System

This guide covers the GAG2 (Grow a Garden 2) item management system for the casino.

## Setup

### 1. Import GAG2 Items to Database

First, import all GAG2 pets and seeds into the database:

```bash
npm run import-gag2
```

This will:
- Clear existing GAG2 items from the database
- Import 8 pets and 6 seeds
- Assign values exactly as listed below

### 2. Auto Deposit Items

Automatically add items to a player's inventory:

```bash
npm run auto-deposit -- <robloxId> "<items>" "<quantities>"
```

**Example:**
```bash
npm run auto-deposit -- 123456 "Frog,Apple,Fire Fern" "1,5,3"
```

This will:
- Add 1 Frog to player 123456's inventory
- Add 5 Apples
- Add 3 Fire Ferns
- Send webhook notification to Discord
- Update player's total deposited value

### 3. Auto Withdraw Items

Initiate a withdrawal for a player's items:

```bash
npm run auto-withdraw -- <robloxId> <quantity>
```

**Example:**
```bash
npm run auto-withdraw -- 123456 5
```

This will:
- Queue the first 5 unlocked items from player 123456's inventory for withdrawal
- Lock the items so they can't be used
- Create withdrawal records for processing
- Send webhook notification to Discord
- Player's mail will receive the items

## Item Lists

### Pets (8 total)

- Raccoon — 140,000
- Black Dragon — 5,000,000
- Ice Serpent — 2,500,000
- Monkey — 1,500
- Golden Dragonfly — 3,000
- Unicorn — 5,000
- Bear — 2,000
- Bald Eagle — 1,000

### Seeds/Crops (6 total)

- Dragon's Breath — 18,000
- Hypno Bloom — 10,000
- Moon Bloom — 9,000
- Ghost Pepper — 12,000
- Pomegranate — 1,000
- Venom Spitter — 2,000

## Rarity Pricing (Base Values)

| Rarity | Base Value |
|--------|-----------|
| Common | 1,000 |
| Uncommon | 5,000 |
| Rare | 10,000 |
| Epic | 25,000 |
| Legendary | 50,000 |
| Mythic | 100,000 |
| Super | 250,000 |

**Note:** You can adjust these values in `gag2_scraper.js` and re-run `npm run import-gag2`

## API Endpoints

### Withdraw Items (Frontend)

```
POST /withdraw
Headers: Authorization: Bearer <jwt>
Body: { chosenItems: [itemId1, itemId2, ...] }
Response: { success: true, message: "Withdrawal request submitted..." }
```

### Get Inventory

```
GET /user/inventory
Headers: Authorization: Bearer <jwt>
Response: { userItems: [...], totalValue: 0, totalItems: 0 }
```

## Discord Webhooks

Withdrawals are automatically posted to your Discord webhook:
- **URL:** https://discord.com/api/webhooks/1525094341150769276/o58Ow9UjSLvUDB4sybVTAHFsO4P9o77Y0PvnsbV0hd5mNkJat5ife3V4gQbTZOiJr1fu

The webhook posts:
- Player username and Roblox ID
- Player level
- List of items being withdrawn
- Total value
- Timestamp

## Troubleshooting

### Import fails with "Cannot find module"
- Make sure you're in the Backend directory
- Run `npm install` if you haven't already

### Auto-deposit/withdraw not working
- Verify the Roblox ID exists in the database
- Check that item names match exactly (case-sensitive)
- Ensure player has items in inventory before withdrawing

### Webhook not sending
- Verify the webhook URL in cashierController.js
- Check Discord webhook is still active
- Review browser console and backend logs for errors

## Next Steps

1. ✅ Import GAG2 items: `npm run import-gag2`
2. ✅ Set item values (you'll do this next)
3. ✅ Test auto-deposit
4. ✅ Test auto-withdraw
5. Frontend will automatically work with the new items
