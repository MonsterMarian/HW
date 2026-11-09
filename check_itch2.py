import urllib.request
import re

url = "https://sebastian.itch.io/digital-logic-sim"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8', errors='ignore')

print("Page title:")
for title in re.findall(r'<title>(.*?)</title>', html):
    print(title)

print("Iframes:")
for iframe in re.findall(r'<iframe[^>]+src="([^"]+)"', html):
    print(iframe)
