# Catatan: jq diganti python escape (untuk windows bash compatibility)
# skywalking plugin dimatikan sementara karena tidak ada di default image 3.10.0
#!/bin/bash
# scripts/check-health.sh
set -e

echo "Memeriksa status container upnfix-db..."
while [ "$(docker inspect --format='{{json .State.Health.Status}}' upnfix-db 2>/dev/null)" != "\"healthy\"" ]; do
  echo "Menunggu MySQL Database siap (status: healthy)..."
  sleep 3
done
echo "✓ upnfix-db siap!"
docker compose ps
