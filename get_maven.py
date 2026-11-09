import urllib.request
import zipfile
import os

url = "https://dlcdn.apache.org/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip"
zip_path = "maven.zip"
target_dir = "maven"

print("Downloading Maven...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp, open(zip_path, 'wb') as f:
        f.write(resp.read())
    print("Extracting Maven...")
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(target_dir)
    print("Maven ready!")
except Exception as e:
    print("Download failed, trying archive fallback:", e)
    archive_url = "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip"
    req = urllib.request.Request(archive_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(zip_path, 'wb') as f:
        f.write(resp.read())
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(target_dir)
    print("Maven archive ready!")
