#!/usr/bin/env python3
import os
import re
from pymongo import MongoClient

# Read MONGODB_URI from Backend/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
mongo_uri = None
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith('MONGODB_URI='):
                mongo_uri = line.strip().split('=', 1)[1]
                break

if not mongo_uri:
    print('MONGODB_URI not found in Backend/.env; falling back to environment variable')
    mongo_uri = os.environ.get('MONGODB_URI')

if not mongo_uri:
    raise SystemExit('No MONGODB_URI available. Set Backend/.env or the MONGODB_URI environment variable.')

print('Using MONGODB_URI:', mongo_uri if len(mongo_uri) < 60 else mongo_uri[:60] + '...')

client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
db = client.get_database()
items = db.get_collection('items')

# Report current counts
missing_count = items.count_documents({"$or": [{"item_image": {"$exists": False}}, {"item_image": None}, {"item_image": ""}]})
print('Items with missing item_image:', missing_count)

gag2_count = items.count_documents({"item_image": {"$regex": 'gag2', "$options": 'i'}})
print("Items with 'gag2' in item_image:", gag2_count)

github_count = items.count_documents({"item_image": {"$regex": 'raw\.githubusercontent\.com', "$options": 'i'}})
print('Items with GitHub raw in item_image:', github_count)

mapping = {
  'Raccoon': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/big_raccoon.webp',
  'Black Dragon': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/black_dragon.webp',
  'Ice Serpent': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/ice_serpent.webp',
  'Monkey': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/monkey_rainbow.webp',
  'Golden Dragonfly': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/big_firefly.webp',
  'Unicorn': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/unicorn_rainbow.webp',
  'Bear': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/bear_rainbow.webp',
  'Bald Eagle': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/big_bald_eagle.webp',
  "Dragon's Breath": 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/dragon_s_breath.webp',
  'Hypno Bloom': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/hypno_bloom.webp',
  'Moon Bloom': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/moon_bloom.webp',
  'Ghost Pepper': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/ghost_pepper.webp',
  'Pomegranate': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/pomegranate.webp',
  'Venom Spitter': 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/venom_spitter.webp',
}

# Apply updates
for name, image_url in mapping.items():
    regex = re.compile(f'^{re.escape(name)}$', re.IGNORECASE)
    query = { 'item_name': { '$regex': regex } }
    # Use updateMany to be safe
    res = items.update_many(query, {'$set': {'item_image': image_url}})
    print(f"Updated '{name}': matched={res.matched_count}, modified={res.modified_count}")

# Re-report counts
missing_count2 = items.count_documents({"$or": [{"item_image": {"$exists": False}}, {"item_image": None}, {"item_image": ""}]})
print('After updates - items with missing item_image:', missing_count2)

gag2_count2 = items.count_documents({"item_image": {"$regex": 'gag2', "$options": 'i'}})
print("After updates - items with 'gag2' in item_image:", gag2_count2)

github_count2 = items.count_documents({"item_image": {"$regex": 'raw\.githubusercontent\.com', "$options": 'i'}})
print('After updates - items with GitHub raw in item_image:', github_count2)

client.close()
print('Done')
