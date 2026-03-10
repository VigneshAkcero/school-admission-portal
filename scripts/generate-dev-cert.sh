#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
CERT_PATH="$CERT_DIR/dev.crt"
KEY_PATH="$CERT_DIR/dev.key"
LAN_IP="${1:-}"

detect_lan_ip() {
  local ip=""

  # macOS
  if command -v ipconfig >/dev/null 2>&1; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$ip" ]]; then
      ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
  fi

  # Linux
  if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi

  # Windows (Git Bash / WSL fallback)
  if [[ -z "$ip" ]] && command -v powershell.exe >/dev/null 2>&1; then
    ip="$(
      powershell.exe -NoProfile -Command "[string](Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -ne '127.0.0.1' -and \$_.PrefixOrigin -ne 'WellKnown' -and \$_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress)" 2>/dev/null \
      | tr -d '\r' || true
    )"
  fi

  if [[ -n "$ip" ]]; then
    echo "$ip"
    return
  fi

  echo "127.0.0.1"
}

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(detect_lan_ip)"
fi

OPENSSL_BIN="${OPENSSL_BIN:-openssl}"
if ! command -v "$OPENSSL_BIN" >/dev/null 2>&1; then
  if [[ -x "/c/Program Files/Git/usr/bin/openssl.exe" ]]; then
    OPENSSL_BIN="/c/Program Files/Git/usr/bin/openssl.exe"
  else
    echo "OpenSSL not found. Install OpenSSL or Git for Windows, then rerun."
    exit 1
  fi
fi

mkdir -p "$CERT_DIR"

TMP_CONF="$(mktemp)"
cleanup() {
  rm -f "$TMP_CONF"
}
trap cleanup EXIT

cat > "$TMP_CONF" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = req_ext
distinguished_name = dn

[dn]
C = IN
ST = Karnataka
L = Bengaluru
O = Local Dev
OU = Working Portal
CN = localhost

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $(hostname)
IP.1 = 127.0.0.1
IP.2 = ${LAN_IP}
EOF

"$OPENSSL_BIN" req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_PATH" \
  -out "$CERT_PATH" \
  -config "$TMP_CONF"

echo "Created development certificate:"
echo "  Certificate: $CERT_PATH"
echo "  Key:         $KEY_PATH"
echo "  SAN IP:      $LAN_IP"
echo
echo "If another device shows a certificate warning, trust this certificate on that device before testing screen sharing."
