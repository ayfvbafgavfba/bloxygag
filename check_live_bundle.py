import urllib.request
import re

url = 'https://bloxygag.org'
html = urllib.request.urlopen(url, timeout=30).read().decode('utf-8', errors='ignore')
m = re.search(r'<script[^>]+src=["\'](?P<src>/assets/index-[^"\']+\.js)["\']', html, re.IGNORECASE)
print('SCRIPT:', m.group('src') if m else 'NONE')
if m:
    bundle = urllib.request.urlopen('https://bloxygag.org' + m.group('src'), timeout=30).read().decode('utf-8', errors='ignore')
    print('HAS_RESET:', 'Reset Inventory' in bundle)
    print('HAS_OWNED:', 'User already owns this item' in bundle)
