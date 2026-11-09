import urllib.request
import zipfile
import os

def download_and_extract(url, target_dir):
    filename = url.split('/')[-1]
    print(f"Downloading {filename}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(filename, 'wb') as f:
        f.write(resp.read())
    print(f"Extracting {filename} to {target_dir}...")
    with zipfile.ZipFile(filename, 'r') as zip_ref:
        zip_ref.extractall(target_dir)
    print(f"Done with {filename}!")

if __name__ == '__main__':
    download_and_extract('https://github.com/hneemann/Digital/releases/download/v0.31/Digital.zip', 'Digital_App')
    download_and_extract('https://github.com/logisim-evolution/logisim-evolution/releases/download/v5.0.0/logisim-evolution-5.0.0-windows-amd64.zip', 'Logisim_App')
