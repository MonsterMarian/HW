import urllib.request
import zipfile
import os

url = "https://github.com/DigitalLogicSimCommunity/Digital-Logic-Sim-CE/releases/download/v0.39.1/DLS_v0.39.1_x86_64_Windows.zip"
zip_name = "DLS_Windows.zip"
target_dir = "DigitalLogicSim_App"

print("Downloading Digital Logic Sim Windows build...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp, open(zip_name, 'wb') as f:
    f.write(resp.read())

print("Extracting...")
with zipfile.ZipFile(zip_name, 'r') as zip_ref:
    zip_ref.extractall(target_dir)

print("Done!")
