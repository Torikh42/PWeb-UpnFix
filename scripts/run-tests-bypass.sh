#!/bin/bash
# =====================================================================
# UPNFIX: Automated Security Testing Script (BYPASS / BEFORE APACHE)
# =====================================================================
# Skrip ini menguji aplikasi Next.js SECARA LANGSUNG di port 3000, 
# mem-bypass perlindungan Apache APISIX.
# =====================================================================

# Warna output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# TARGET: PORT 3000 SECARA LANGSUNG (TANPA HTTPS)
BASE_URL="http://localhost:3000"
COOKIE_FILE="test_cookies_bypass.txt"
TOTAL_PASSED=0
TOTAL_FAILED=0

# Bersihkan cookie lama jika ada
rm -f "$COOKIE_FILE"

echo -e "${CYAN}=====================================================================${NC}"
echo -e "${CYAN}          UPNFIX - BYPASS SECURITY TESTING (PORT 3000)               ${NC}"
echo -e "${CYAN}=====================================================================${NC}"
echo -e "PERINGATAN: Test ini langsung menembak aplikasi tanpa perlindungan Gateway."
echo -e "Ekspektasi: Beberapa perlindungan krusial (TLS & Rate Limit) akan GAGAL."
echo ""

# Fungsi pembantu untuk mencatat hasil test
assert_status() {
  local test_name="$1"
  local expected_status="$2"
  local actual_status="$3"

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo -e "  [${GREEN}PASS${NC}] $test_name (Expected: $expected_status, Got: $actual_status)"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
  else
    echo -e "  [${RED}FAIL${NC}] $test_name (Expected: $expected_status, Got: $actual_status)"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
  fi
}

# ---------------------------------------------------------------------
# TEST 1: Broken Access Control (L5 Session - Tanpa Login)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 1] Pengujian BAC: Akses API Tanpa Login (Layer 5/7)${NC}"
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")
assert_status "Akses GET /api/users tanpa token" 401 "$STATUS"
echo ""

# ---------------------------------------------------------------------
# TEST 2: TLS HTTPS Redirect (L6 Presentation)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 2] Pengujian TLS Redirect (Layer 6)${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [[ "$STATUS" =~ ^(301|302|307|308)$ ]]; then
  echo -e "  [${GREEN}PASS${NC}] Redirect HTTP ke HTTPS sukses (Got: $STATUS)"
  TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
  echo -e "  [${RED}FAIL${NC}] Redirect HTTP ke HTTPS gagal! Aplikasi rentan Sniffing. (Got: $STATUS)"
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
echo ""

# ---------------------------------------------------------------------
# TEST 3: Registrasi User Baru (L7 Application)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 3] Registrasi Akun User Biasa Baru (Layer 7)${NC}"
RANDOM_NUM=$((RANDOM % 10000))
TEST_EMAIL="bypass_${RANDOM_NUM}@upnfix.id"
TEST_PASS="userpassword123"

STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Test Bypass User\", \"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}" \
  "$BASE_URL/api/auth/signup")

assert_status "Sign up user biasa baru ($TEST_EMAIL)" 201 "$STATUS"
echo ""

# ---------------------------------------------------------------------
# TEST 4: Login User Biasa (L5 Session Management)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 4] Login Akun User Biasa (Layer 5)${NC}"
STATUS=$(curl -k -s -c "$COOKIE_FILE" -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}" \
  "$BASE_URL/api/auth/login")

assert_status "Login user biasa dan simpan cookie" 200 "$STATUS"
echo ""

# ---------------------------------------------------------------------
# TEST 5: BAC User Biasa Akses Admin API (L7 Access Control)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 5] Pengujian BAC: User Biasa Akses Menu Admin (Layer 7)${NC}"
STATUS=$(curl -k -s -b "$COOKIE_FILE" -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")
assert_status "User biasa akses GET /api/users" 403 "$STATUS"
echo ""

# Bersihkan cookie
rm -f "$COOKIE_FILE"

# ---------------------------------------------------------------------
# TEST 6: Login Admin (L5 Session Management)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 6] Login Akun Administrator (Layer 5)${NC}"
STATUS=$(curl -k -s -c "$COOKIE_FILE" -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@upnfix.id\", \"password\":\"adminpassword\"}" \
  "$BASE_URL/api/auth/login")

assert_status "Login admin dan simpan cookie" 200 "$STATUS"
echo ""

# ---------------------------------------------------------------------
# TEST 7: Akses Admin API (L7 Access Control)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 7] Pengujian Otorisasi Admin: Akses API Data User (Layer 7)${NC}"
STATUS=$(curl -k -s -b "$COOKIE_FILE" -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")
assert_status "Admin sukses akses GET /api/users" 200 "$STATUS"
echo ""

# Bersihkan cookie
rm -f "$COOKIE_FILE"

# ---------------------------------------------------------------------
# TEST 8: SQL Injection Protection (L6 Escaping & L7 Validation)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 8] Pengujian Proteksi SQL Injection (Layer 6/7)${NC}"
STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@upnfix.id' OR '1'='1\", \"password\":\"salahpass\"}" \
  "$BASE_URL/api/auth/login")

if [ "$STATUS" -eq 400 ] || [ "$STATUS" -eq 401 ]; then
  echo -e "  [${GREEN}PASS${NC}] SQL Injection diblokir dengan aman oleh logika Backend (Got: $STATUS)"
  TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
  echo -e "  [${RED}FAIL${NC}] SQL Injection berpotensi lolos (Got: $STATUS)"
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
echo ""

# ---------------------------------------------------------------------
# TEST 9: Rate Limiting / DoS Prevention (L7 Traffic Control)
# ---------------------------------------------------------------------
echo -e "${YELLOW}[Test 9] Pengujian Rate Limiting / Anti-DoS (Layer 7)${NC}"
echo "  Mengirimkan 11 request instan ke login endpoint..."

BLOCKED=0
for i in {1..11}; do
  STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"spam@upnfix.id\", \"password\":\"spam\"}" \
    "$BASE_URL/api/auth/login")
  
  if [ "$STATUS" -eq 429 ]; then
    BLOCKED=1
    echo -e "  -> Request ke-$i terdeteksi spam dan ${GREEN}DIBLOKIR (429)${NC}"
    break
  fi
done

if [ "$BLOCKED" -eq 1 ]; then
  echo -e "  [${GREEN}PASS${NC}] Rate limit / Anti-DoS berhasil menahan spam"
  TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
  echo -e "  [${RED}FAIL${NC}] Rate limit GAGAL menahan spam! Aplikasi rentan Serangan DoS / Brute Force."
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
echo ""

# ---------------------------------------------------------------------
# KESIMPULAN
# ---------------------------------------------------------------------
echo -e "${CYAN}=====================================================================${NC}"
echo -e "                       RINGKASAN HASIL TESTING                       "
echo -e "${CYAN}=====================================================================${NC}"
echo -e "  Total Test Sukses (PASSED) : ${GREEN}$TOTAL_PASSED${NC}"
echo -e "  Total Test Gagal (FAILED)  : ${RED}$TOTAL_FAILED${NC}"
echo -e "${CYAN}=====================================================================${NC}"
echo ""

if [ "$TOTAL_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ SEMUA KONTROL KEAMANAN BERFUNGSI DENGAN BAIK!${NC}"
else
  echo -e "${RED}✗ DITEMUKAN $TOTAL_FAILED CELAH KEAMANAN KARENA GATEWAY DI-BYPASS!${NC}"
fi
echo ""
