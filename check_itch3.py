import urllib.request
import re

url = "https://sebastian.itch.io/digital-logic-sim"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8', errors='ignore')

# search for csrf or upload or download
for match in re.finditer(r'(download|upload|file|windows|mac|linux)', html, re.I):
    start = max(0, match.start() - 50)
    end = min(len(html), match.end() + 100)
    print("---", html[start:end])
