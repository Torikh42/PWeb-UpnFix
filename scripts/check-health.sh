#!/bin/bash
# =============================================================
# scripts/check-health.sh
# Script pemantau status kesehatan seluruh container UPNFIX.
# Jalankan SETELAH `docker compose up -d` untuk memastikan
# semua service siap sebelum menjalankan setup-apisix.sh.
# =============================================================
# Cara penggunaan:
#   bash scripts/check-health.sh
# =============================================================

set -e

# Warna output terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}   UPNFIX Container Health Monitor         ${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# --- Fungsi 1: Tunggu hingga MySQL siap (status: healthy) ---
wait_for_db() {
  echo -e "${YELLOW}[1/3] Menunggu upnfix-db siap (status: healthy)...${NC}"
  local RETRIES=0
  local MAX=30

  while true; do
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' upnfix-db 2>/dev/null || echo '"unknown"')

    if [ "$STATUS" = '"healthy"' ]; then
      echo -e "${GREEN}  ✓ upnfix-db berstatus: HEALTHY${NC}"
      break
    fi

    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX" ]; then
      echo -e "${RED}  ✗ Timeout! upnfix-db tidak siap setelah ${MAX} percobaan.${NC}"
      echo -e "${RED}    Periksa log dengan: docker logs upnfix-db${NC}"
      exit 1
    fi

    echo -e "  ... Status saat ini: ${STATUS} (percobaan ${RETRIES}/${MAX})"
    sleep 3
  done
}

# --- Fungsi 2: Tunggu hingga APISIX siap ---
wait_for_apisix() {
  echo ""
  echo -e "${YELLOW}[2/3] Menunggu apisix siap (Admin API responsive)...${NC}"
  local RETRIES=0
  local MAX=20

  while true; do
    if curl -s -f -H 'X-API-KEY: edd1y83n4039gli7' \
        http://localhost:9180/apisix/admin/services > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ apisix Admin API berstatus: READY${NC}"
      break
    fi

    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX" ]; then
      echo -e "${RED}  ✗ Timeout! APISIX Admin API tidak merespons.${NC}"
      echo -e "${RED}    Periksa log dengan: docker logs apisix${NC}"
      exit 1
    fi

    echo -e "  ... Belum siap (percobaan ${RETRIES}/${MAX})"
    sleep 3
  done
}

# --- Fungsi 3: Tampilkan status semua container ---
show_all_status() {
  echo ""
  echo -e "${YELLOW}[3/3] Status seluruh container UPNFIX:${NC}"
  echo ""
  docker compose ps
  echo ""
}

# --- Eksekusi ---
wait_for_db
wait_for_apisix
show_all_status

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Semua service SIAP! Lanjutkan dengan:     ${NC}"
echo -e "${GREEN}    bash scripts/setup-apisix.sh            ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
