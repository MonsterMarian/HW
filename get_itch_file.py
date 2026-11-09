import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
req = urllib.request.Request('https://sebastian.itch.io/digital-logic-sim', headers=headers)
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

csrf_match = re.search(r'csrf_token["\'\s:=]+([a-zA-Z0-9_\-\.\+/=]+)', html)
print('CSRF:', csrf_match.group(1) if csrf_match else 'None')

uploads = re.findall(r'data-upload_id="(\d+)"', html)
print('Uploads:', uploads)

# look for download buttons or forms
forms = re.findall(r'<form[^>]+action="([^"]+)"[^>]*>(.*?)</form>', html, re.DOTALL)
for action, body in forms:
    print('Form action:', action)
