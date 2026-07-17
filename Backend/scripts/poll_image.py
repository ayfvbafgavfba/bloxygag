#!/usr/bin/env python3
import time
import urllib.request
from urllib.error import URLError, HTTPError

url = 'https://bloxygag.org/images/gag2/big_raccoon.webp'
for i in range(15):
    print(f'poll {i}')
    req = urllib.request.Request(url, method='HEAD', headers={'Accept': 'image/*'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            status = r.status
            ctype = r.getheader('Content-Type')
            print('status', status, 'content-type', ctype)
            if status == 200 and ctype and ctype.startswith('image/'):
                print('OK: image served')
                break
            if status in (301,302,303,307,308):
                print('redirect:', r.getheader('Location'))
                break
    except HTTPError as e:
        print('HTTPError', e.code)
    except URLError as e:
        print('URLError', e)
    except Exception as e:
        print('Error', e)
    time.sleep(8)
print('done')
