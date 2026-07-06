#!/usr/bin/env bash
if ! sudo echo "[sudo] perms granted";
then
  echo "- [ERROR] This script requires sudo perms"
  exit 1
fi

# optionals
read -p "Do you want to install FFMPEG? (y/N): " install_ffmpeg
read -p "Do you want to install curl-cffi? (y/N): " install_curl_cffi

# download the latest official YT-DLP binary and make it executable
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# install ffmpeg (essential for yt-dlp to merge audio/video)
if [[ "$install_ffmpeg" =~ ^[Yy]$ ]]; then
  sudo apt update && sudo apt install ffmpeg -y
fi

# curl-cffi impersonation
if [[ "$install_curl_cffi" =~ ^[Yy]$ ]]; then
  if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "pip not found. Installing python3-pip..."
    sudo apt update && sudo apt install python3-pip -y
  fi

  if command -v pip3 &> /dev/null; then
    pip3 install curl-cffi
  else
    pip install curl-cffi
  fi
fi
