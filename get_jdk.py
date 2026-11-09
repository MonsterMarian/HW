import urllib.request
import zipfile
import os
import sys

url = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse"
zip_path = "jdk21.zip"
target_dir = "jdk"

print("Downloading OpenJDK 21...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp, open(zip_path, 'wb') as f:
    chunk_size = 1024 * 1024 * 4
    total = 0
    while True:
        chunk = resp.read(chunk_size)
        if not chunk:
            break
        f.write(chunk)
        total += len(chunk)
        print(f"Downloaded {round(total / (1024*1024), 1)} MB...", flush=True)

print("Extracting OpenJDK 21...")
with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall(target_dir)

print("JDK is ready!")
