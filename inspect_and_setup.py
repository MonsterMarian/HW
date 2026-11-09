import os
import sys
import urllib.request
import json
import zipfile

def check_itch():
    url = "https://sebastian.itch.io/digital-logic-sim"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            import re
            uploads = re.findall(r'data-upload_id="(\d+)"', html)
            print("itch upload IDs:", uploads)
            
            # check download links
            links = re.findall(r'https://[^"]+', html)
            for l in links:
                if 'itch' in l and ('download' in l or 'file' in l):
                    print("link:", l)
    except Exception as e:
        print("itch error:", e)

def check_logisim_zip():
    url = "https://github.com/logisim-evolution/logisim-evolution/releases/download/v5.0.0/logisim-evolution-5.0.0-windows-amd64.zip"
    print("Logisim windows zip available at:", url)

if __name__ == "__main__":
    check_itch()
    check_logisim_zip()
