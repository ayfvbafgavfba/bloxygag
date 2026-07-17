#!/usr/bin/env python3
import os
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

query = {'game': {'$regex': '^GAG2$', '$options': 'i'}}
proj = {'item_name': 1, 'item_image': 1}

cursor = items.find(query, proj).sort('item_name', 1)
rows = list(cursor)
print('Total GAG2 items:', len(rows))
print('---')
for doc in rows:
    name = doc.get('item_name') or doc.get('display_name') or '<no-name>'
    img = doc.get('item_image') or '<MISSING>'
    print(f"{name} -> {img}")

client.close()
