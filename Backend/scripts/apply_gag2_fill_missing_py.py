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
    mongo_uri = os.environ.get('MONGODB_URI')
if not mongo_uri:
    raise SystemExit('No MONGODB_URI available.')

client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
db = client.get_database()
items = db.get_collection('items')

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

def find_mapping(name):
    for key in mapping.keys():
        if name and name.strip().lower() == key.lower():
            return mapping[key]
    return None

query = {
    '$and': [
        {'game': {'$regex': '^GAG2$', '$options': 'i'}},
        {'$or': [
            {'item_image': {'$exists': False}},
            {'item_image': None},
            {'item_image': ''}
        ]}
    ]
}

cursor = items.find(query)
count = 0
for doc in cursor:
    name = doc.get('item_name') or doc.get('display_name') or ''
    chosen = find_mapping(name)
    if not chosen:
        chosen = mapping['Raccoon']
    res = items.update_one({'_id': doc['_id']}, {'$set': {'item_image': chosen}})
    print(f"Set item '{name}' (_id={doc['_id']}) -> {chosen}; modified={res.modified_count}")
    count += 1

print('Total updated missing GAG2 items:', count)
client.close()
