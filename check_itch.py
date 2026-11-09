import urllib.request
import re

url = "https://sebastian.itch.io/digital-logic-sim"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8', errors='ignore')

# find upload buttons
matches = re.findall(r'<a[^>]+download_btn[^>]*>.*?</a>', html, re.DOTALL)
for m in matches:
    print("Match:", m)

# find all links or data attributes
for line in html.splitlines():
    if 'download' in line.lower() or 'windows' in line.lower() or 'upload' in line.lower():
        print("Line:", line[:120])
