#!/usr/bin/env bash
set -euo pipefail

if ! sudo echo "[sudo] perms granted";
then
  echo This script requires sudo perms
fi

#if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
#  echo "- [ERROR] This script must be run as root (use sudo)."
#  exit 1
#fi

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make start/stop scripts executable
for f in start.sh stop.sh; do
  if [[ -f "$BASE_DIR/$f" ]]; then
    chmod +x "$BASE_DIR/$f"
    echo "- [SUCCESS] Made $f executable"
  else
    echo "- [WARNING] $f not found in $BASE_DIR"
  fi
done

# Install and enable systemd service
if [[ -f "$BASE_DIR/mao.service" ]]; then
  sudo cp "$BASE_DIR/mao.service" /etc/systemd/system/mao.service
  sudo systemctl daemon-reload
  sudo systemctl enable mao.service
  echo "- [SUCCESS] Installed and enabled mao.service"
else
  echo "- [ERROR] mao.service not found in $BASE_DIR"
  exit 2
fi

# Install fend globally
FEND_BIN="/usr/bin/fend"
FEND_URL="https://github.com/printfn/fend/releases/download/v1.5.7/fend-1.5.7-linux-x86_64-gnu.zip"
if command -v fend >/dev/null 2>&1; then
  echo "- [SUCCESS] fend already installed at $(command -v fend)"
else
  if [[ -f "$BASE_DIR/fend" ]]; then
    cp "$BASE_DIR/fend" "$FEND_BIN"
    chmod 0755 "$FEND_BIN"
    echo "- [SUCCESS] Installed fend from local file"
  elif [[ -n "${FEND_URL:-}" ]]; then
    tmpdir="$(mktemp -d)" || { echo "Failed to create temp dir"; exit 3; }
    trap 'rm -rf "$tmpdir"' EXIT
    zipfile="$tmpdir/fend.zip"

    # download
    if ! curl -fL "$FEND_URL" -o "$zipfile"; then
      echo "- [ERROR] Failed to download $(FEND_URL)" >&2
      exit 3
    fi

    # extract
    if command -v unzip >/dev/null 2>&1; then
      unzip -q "$zipfile" -d "$tmpdir" || {
        echo "- [ERROR] Failed to unzip $zipfile" >&2;
        exit 3;
      }
    elif command -v bsdtar >/dev/null 2>&1; then
      bsdtar -xf "$zipfile" -C "$tmpdir" || {
        echo "- [ERROR] Failed to extract $zipfile" >&2;
        exit 3;
      }
    else
      echo "- [ERROR] Either 'unzip' or 'bsdtar' is required to extract $zipfile" >&2
      exit 3
    fi

    # find executable named 'fend' (or fallback to any executable starting with 'fend')
    FOUNDFILE="$(find "$tmpdir" -type f -name 'fend' -executable -print -quit || true)"
    if [[ -z "$FOUNDFILE" ]]; then
      FOUNDFILE="$(find "$tmpdir" -type f -iname 'fend*' -executable -print -quit || true)"
    fi

    if [[ -z "$FOUNDFILE" ]]; then
      echo "- [ERROR] Could not locate 'fend' binary inside archive" >&2
    else
      cp "$FOUNDFILE" "$FEND_BIN"
      chmod 0755 "$FEND_BIN"
      echo "- [SUCCESS] Downloaded fend from $(echo $FEND_URL)"
    fi
  else
    echo "- [ERROR] Failed to download fend automatically. Place a 'fend' binary next to this script or set FEND_URL."
    exit 3
  fi
fi

# Replace fend config
FEND_CONFIG=$(fend --help | grep -i "config file" | sed -E 's@config file:\s+(.+)$@\1@i')
if [[ -f "$BASE_DIR/fend-config.toml" ]]; then
  mkdir -p $(dirname $FEND_CONFIG)
  sudo cp "$BASE_DIR/fend-config.toml" "$FEND_CONFIG"
  sudo chown root:root "$FEND_CONFIG"
  sudo chmod 0644 "$FEND_CONFIG"
  echo "- [SUCCESS] Copied fend config \"$BASE_DIR/fend-config.toml\"->\"$FEND_CONFIG\""
else
  echo "- [WARNING] fend-config.toml not found in $BASE_DIR"
fi

echo "[DONE] Installation complete."
