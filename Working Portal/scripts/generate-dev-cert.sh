#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
CERT_PATH="$CERT_DIR/dev.crt"
KEY_PATH="$CERT_DIR/dev.key"
LAN_IP="${1:-}"

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="127.0.0.1"
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

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_PATH" \
  -out "$CERT_PATH" \
  -config "$TMP_CONF"

echo "Created development certificate:"
echo "  Certificate: $CERT_PATH"
echo "  Key:         $KEY_PATH"
echo "  SAN IP:      $LAN_IP"
echo
echo "If another device shows a certificate warning, trust this certificate on that device before testing screen sharing."
