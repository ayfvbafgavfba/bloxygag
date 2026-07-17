import requests
from pathlib import Path

out_dir = Path(r'C:\Users\User\Downloads\bloxpvp-casino-roblox-fresh-main\bloxpvp-casino-roblox-fresh-main\Backend\public\images\gag2')
out_dir.mkdir(parents=True, exist_ok=True)

mapping = {
    'Raccoon': ('https://cdn.gag2.gg/items/big_raccoon.webp', 'big_raccoon.webp'),
    'Black Dragon': ('https://cdn.gag2.gg/items/black_dragon.webp', 'black_dragon.webp'),
    'Ice Serpent': ('https://cdn.gag2.gg/items/ice_serpent.webp', 'ice_serpent.webp'),
    'Monkey': ('https://cdn.gag2.gg/items/monkey_rainbow.webp', 'monkey_rainbow.webp'),
    'Golden Dragonfly': ('https://cdn.gag2.gg/items/big_firefly.webp', 'big_firefly.webp'),
    'Unicorn': ('https://cdn.gag2.gg/items/unicorn_rainbow.webp', 'unicorn_rainbow.webp'),
    'Bear': ('https://cdn.gag2.gg/items/bear_rainbow.webp', 'bear_rainbow.webp'),
    'Bald Eagle': ('https://cdn.gag2.gg/items/big_bald_eagle.webp', 'big_bald_eagle.webp'),
    "Dragon's Breath": ('https://cdn.gag2.gg/items/dragon_s_breath.webp', 'dragon_s_breath.webp'),
    'Hypno Bloom': ('https://cdn.gag2.gg/items/hypno_bloom.webp', 'hypno_bloom.webp'),
    'Moon Bloom': ('https://cdn.gag2.gg/items/moon_bloom.webp', 'moon_bloom.webp'),
    'Ghost Pepper': ('https://cdn.gag2.gg/items/ghost_pepper.webp', 'ghost_pepper.webp'),
    'Pomegranate': ('https://cdn.gag2.gg/items/pomegranate.webp', 'pomegranate.webp'),
    'Venom Spitter': ('https://cdn.gag2.gg/items/venom_spitter.webp', 'venom_spitter.webp'),
}

for name, (url, filename) in mapping.items():
    path = out_dir / filename
    if path.exists():
        print(f'Skipping {name} (exists)')
        continue
    r = requests.get(url, timeout=30, headers={'User-Agent':'Mozilla/5.0'})
    r.raise_for_status()
    path.write_bytes(r.content)
    print(f'Downloaded {name} -> {path}')
