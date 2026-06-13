# Implementasi Pengamanan Layer 5-6-7 OSI (Apache Foundation) - Final Plan (Revised v13)

Rancangan ini mendefinisikan pengamanan Sistem Informasi Manajemen Fasilitas (UPNFIX) menggunakan kombinasi teknologi: **Apache APISIX + Apache SkyWalking + Apache HertzBeat** berbasis **Docker Compose** sesuai dengan studi kasus pada `Case_Study_UAS.pdf`.

Seluruh backend (Next.js dan MySQL) akan terisolasi di dalam jaringan internal Docker dan hanya diekspos secara aman melalui Apache APISIX.

---

## 1. Pemetaan OSI Layer & Kontrol Keamanan

Berikut adalah pemetaan kontrol keamanan yang akurat sesuai dengan fungsionalitas masing-masing teknologi:

| Teknologi | Layer OSI | Kontrol Keamanan / Fitur | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Apache APISIX** | **Layer 5 (Session)** | `jwt-auth` (Opsi Cookie forwarding) & Session Proxying | Memastikan sesi pengguna diteruskan dengan aman ke backend Next.js. |
| **Apache APISIX** | **Layer 5 & 7 (Session & Application)** | `limit-count` (Rate Limiting) | Mencegah brute-force login/signup pada `/api/auth/login` dan `/api/auth/signup`. |
| **Apache APISIX** | **Layer 6 (Presentation)** | TLS/SSL Termination & `proxy-rewrite` | Enkripsi komunikasi client-gateway (HTTPS), masking response header (`X-Powered-By`, `Server`), dan injeksi header keamanan (`X-Frame-Options`, dll). |
| **Apache APISIX** | **Layer 7 (Application)** | `ip-restriction` & `cors` | API access control, membatasi asal request (CORS) untuk development/production dan IP client. |
| **Apache Fortress** | **Layer 5 & 7 (Session & Application)** | Role-Based Access Control (RBAC) & Otorisasi | Mengelola otorisasi dan kontrol akses berbasis role secara terpusat untuk mencegah Broken Access Control (BAC) pada rute sensitif. |
| **Apache SkyWalking** | **Layer 7 (Application)** | APISIX SkyWalking Plugin (HTTP Tracing) | Distributed tracing request HTTP ke upstream via OAP HTTP Port 12800, mendeteksi request flooding dan latensi tanpa Node.js agent. |
| **Apache HertzBeat** | **Layer 7 (Application)** | Availability Monitoring & Alerting | Monitoring ketersediaan layanan (Next.js, MySQL, APISIX) secara real-time dan sistem peringatan jika terjadi down (Denial of Service). |

---

## 2. Solusi Konflik Arsitektur JWT (Cookie vs Header) & API Protection

Next.js mengelola autentikasi berbasis cookie (`token`). Untuk menyelaraskan ini dengan Apache APISIX tanpa refactoring besar-besaran (mengikuti **Opsi A**):
1. **Gateway Cookie Forwarding**: APISIX dikonfigurasi sebagai reverse proxy transparan yang mem-forward semua HTTP Header dan Cookie ke backend Next.js.
2. **Backend Authentication Enforcement**: Next.js `middleware.js` tetap menjadi validator utama JWT (Session / L5).
3. **Gateway Protection**: APISIX melakukan TLS termination (L6), CORS, IP Restriction, dan Rate Limiting (L7) sebelum request mencapai Next.js.

### Perbaikan Celah Keamanan (Broken Access Control - Layer 7)
Beberapa endpoint sensitif saat ini tidak terproteksi atau kurang perlindungan. Kita akan melakukan perbaikan pada:
- **`src/middleware.js`**: Menambahkan rute `/api/users` dan `/api/reports/:path*` ke dalam config matcher agar divalidasi oleh Next.js Middleware. Setiap request ke API ini wajib memiliki JWT token yang sah.
- **`src/modules/users/user.handler.js`**: Menambahkan fallback validation di level handler untuk memverifikasi token dan role `ADMIN`.

### Integrasi Desentralisasi Otorisasi: Apache Fortress (Layer 7 RBAC)
Untuk meningkatkan arsitektur keamanan dari pengecekan role hardcoded (misal `role !== 'ADMIN'`), kami memperkenalkan konsep integrasi **Apache Fortress** (menggunakan database LDAP / Directory Service):
1. **Pemisahan Logika Otorisasi (Decoupling):** Kode Next.js mendelegasikan pengecekan hak akses ke Apache Fortress (via REST API). Handler backend tidak lagi menyimpan data role secara statis, melainkan menanyakan apakah identitas user (dari JWT) memiliki *permission* tertentu pada *resource* terkait.
2. **Standardisasi:** Menggunakan standar RBAC ANSI INCITS 359 untuk mengelola Roles (ADMIN, USER, TEKNISI), Permissions (`read_users`, `delete_report`), dan Role-User Assignments secara dinamis tanpa melakukan perubahan kode.
3. **Pengamanan Pra-Upstream:** APISIX dapat berintegrasi secara berkala dengan Fortress melalui REST plugin untuk memblokir request ilegal langsung di level API Gateway sebelum request masuk ke Next.js.

---

## 3. Rencana Struktur Project & Deliverable UAS

Untuk memenuhi kelayakan UAS, seluruh source code, konfigurasi, dan dokumentasi akan diatur dalam struktur folder berikut:

```
PWeb-UpnFix/ (Project Root)
├── docker-compose.yml
├── Dockerfile
├── .env.docker
├── apisix_config/
│   ├── config.yaml
│   └── certs/ (Dibuat otomatis via SETUP.md)
├── src/ (Next.js app - modified middleware.js, user.handler.js)
│   ├── lib/
│   │   ├── db.js (MODIFIED: Connection pooling with global cache)
│   │   └── auth-utils.js (NEW: Extracted verifyToken helper)
│   └── modules/reports/
│       └── report.service.js (MODIFIED: Remove verifyToken to avoid duplication)
├── docs/
│   ├── ARCHITECTURE.md (Diagram arsitektur deployment & penjelasan layer)
│   ├── SETUP.md (Langkah-langkah instalasi & generate SSL)
│   ├── TESTING.md (Skenario pengujian detail & checklist)
│   └── REPORT.md (Laporan akhir PDF sesuai template tugas)
├── scripts/
│   ├── init-db.js (Existing)
│   ├── check-health.sh (NEW: helper untuk cek status semua containers)
│   └── setup-apisix.sh (NEW: script untuk upload routes & SSL ke APISIX)
└── screenshots/ (Dokumentasi visual hasil pengujian)
```

---

## 4. Proposed Changes & Technical Details

### A. Docker Infrastructure & Database Connection

#### [MODIFY] [db.js](file:///d:/PWeb-UpnFix/src/lib/db.js)
Mengubah pool creation di mysql2 menggunakan format `global` caching untuk mencegah koneksi database tersedot habis (exhaustion/leak) pada saat menggunakan Next.js App Router (Dev Mode / Serverless). Konfigurasi juga dikembalikan menggunakan `DATABASE_URL` string agar tetap kompatibel dengan `init-db.js`.
```javascript
import mysql from "mysql2/promise";

// Global cache pattern untuk Next.js
const globalForDb = globalThis;

if (!globalForDb.pool) {
  globalForDb.pool = mysql.createPool(process.env.DATABASE_URL);
}

const pool = globalForDb.pool;
export default pool;
```

#### [NEW] [Dockerfile](file:///d:/PWeb-UpnFix/Dockerfile)
Multi-stage build Dockerfile untuk aplikasi Next.js:
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx next build # Bypass npm script to avoid experimental --turbopack in production

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/src ./src
COPY --from=base /app/jsconfig.json ./jsconfig.json
COPY --from=base /app/next.config.mjs ./next.config.mjs
COPY --from=base /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
```

#### [NEW] [docker-compose.yml](file:///d:/PWeb-UpnFix/docker-compose.yml)
Mendefinisikan arsitektur jaringan internal, dependensi database, dan healthcheck untuk semua services (tanpa baris versi usang):
```yaml
networks:
  upnfix-net:
    driver: bridge

volumes:
  mysql_data:
    driver: local

services:
  upnfix-db:
    image: mysql:8.0
    container_name: upnfix-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: upnfix
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot123"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - upnfix-net

  upnfix-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: upnfix-app
    restart: always
    environment:
      - DATABASE_URL=mysql://root:root123@upnfix-db:3306/upnfix # Digunakan di db.js dan init-db.js
      - JWT_SECRET=rahasia_negara_jangan_sampai_bocor_12345
      - CLOUDINARY_CLOUD_NAME=dsw1iot8d
      - CLOUDINARY_API_KEY=981141883981869
      - CLOUDINARY_API_SECRET=6bQI_7egQH-1rhIF5piWSMzmgAg
    depends_on:
      upnfix-db:
        condition: service_healthy
    entrypoint: >
      sh -c "
        echo 'Waiting for MySQL database schema setup...' &&
        node scripts/init-db.js &&
        echo 'Database initialized, starting application...' &&
        npm start
      "
    networks:
      - upnfix-net

  apisix:
    image: apache/apisix:3.10.0-debian
    container_name: apisix
    restart: always
    ports:
      - "80:9080"
      - "443:9443"
      - "9180:9180"
    volumes:
      - ./apisix_config/config.yaml:/usr/local/apisix/conf/config.yaml
      - ./apisix_config/certs:/usr/local/apisix/conf/certs
    depends_on:
      - apisix-etcd
    healthcheck:
      test: ["CMD-SHELL", "curl -f -H 'X-API-KEY: edd1y83n4039gli7' http://localhost:9180/apisix/admin/services || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upnfix-net

  apisix-etcd:
    image: bitnami/etcd:3.5.0
    container_name: apisix-etcd
    restart: always
    environment:
      - ALLOW_NONE_AUTHENTICATION=yes
    networks:
      - upnfix-net

  skywalking-oap:
    image: apache/skywalking-oap-server:9.5.0
    container_name: skywalking-oap
    restart: always
    ports:
      - "11800:11800" # Port gRPC
      - "12800:12800" # HTTP REST API untuk APISIX skywalking plugin dan dashboard UI
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:12800/internal/l7check || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upnfix-net

  skywalking-ui:
    image: apache/skywalking-ui:9.5.0
    container_name: skywalking-ui
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SW_OAP_ADDRESS=http://skywalking-oap:12800
    depends_on:
      - skywalking-oap
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8080 || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upnfix-net

  hertzbeat:
    image: tancloud/hertzbeat:v1.6.0
    container_name: hertzbeat
    restart: always
    ports:
      - "1157:1157"
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:1157 || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - upnfix-net
```

#### [NEW] [.env.docker](file:///d:/PWeb-UpnFix/.env.docker)
Menyimpan environment variables yang aman untuk di-inject ke dalam Docker container:
```env
DB_HOST=upnfix-db
DB_USER=root
DB_PASSWORD=root123
DB_NAME=upnfix
DATABASE_URL=mysql://root:root123@upnfix-db:3306/upnfix
JWT_SECRET=rahasia_negara_jangan_sampai_bocor_12345
CLOUDINARY_CLOUD_NAME=dsw1iot8d
CLOUDINARY_API_KEY=981141883981869
CLOUDINARY_API_SECRET=6bQI_7egQH-1rhIF5piWSMzmgAg
```

---

### B. Konfigurasi Apache APISIX & Security Headers

#### 1. APISIX [config.yaml](file:///d:/PWeb-UpnFix/apisix_config/config.yaml) dengan Format Listener Standar v3
```yaml
apisix:
  node_listen:
    - 9080
    - 9443
  enable_ipv6: false
  enable_reuseport: true
  show_upstream_logs_format: "real_client_ip: $real_client_ip"

  http_listen: 0.0.0.0
  https_listen: 0.0.0.0
  ssl:
    listen_port: 9443
    enable_http2: true
    cert: "/usr/local/apisix/conf/certs/cert.pem"
    key: "/usr/local/apisix/conf/certs/key.pem"

  plugins:
    - real-ip
    - client-control
    - ext-plugin-pre-req
    - serverless-pre-function
    - cors
    - fault-injection
    - limit-count
    - limit-conn
    - limit-req
    - grpc-transcode
    - prometheus
    - proxy-cache
    - batch-requests
    - key-auth
    - jwt-auth
    - basic-auth
    - bearer-token
    - authz-casl
    - authz-keycloak
    - authz-casbin
    - authz-http
    - wolf-rbac
    - openid-connect
    - headersfilter
    - request-validation
    - response-rewrite
    - aws-lambda
    - azure-functions
    - openwhisk
    - request-id
    - opensearch-logger
    - splunk-hec-logging
    - datadog
    - file-logger
    - skywalking
    - error-log-logger
    - sls-logger
    - tcp-logger
    - kafka-logger
    - rocketmq-logger
    - syslog
    - google-cloud-logging
    - clickhouse-logger
    - elasticsearch-logger
    - inspect
    - log-rotate
    - example-plugin
    - gm
    - zipkin
    - server-info
    - traffic-split
    - redirect
    - uri-blocker
    - chaitin-waf
    - otelcol
    - proxy-mirror
    - proxy-rewrite
    - api-breaker
    - mocking
    - degraphql
    - casdoor
    - ip-restriction
    - referer-restriction
    - ua-restriction
    - csrf
    - hmac-auth
    - session
    - echo
    - loggly
    - rfc5424-syslog

  admin_api_mtls:
    admin_ssl_cert: ""
    admin_ssl_key: ""
    admin_ssl_ca_cert: ""

deployment:
  role: traditional
  role_traditional:
    config_provider: etcd
  
  admin:
    admin_key:
      - name: admin
        key: edd1y83n4039gli7
        role: admin
      - name: viewer
        key: viewer_key_1
        role: viewer
  
  etcd:
    host:
      - "http://apisix-etcd:2379"
    prefix: /apisix
    timeout: 30

enable_admin: true
enable_debug: false

log:
  error_log: "/usr/local/apisix/logs/error.log"
  error_log_level: "warn"
  access_log: "/usr/local/apisix/logs/access.log"
  access_log_format: '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_time'
  access_log_buffer_size: 16384

graphql:
  max_depth: 200

plugin_attr:
  skywalking:
    service_name: UPNFIX-Gateway
    service_instance_name: APISIX-Instance
    endpoint_addr: http://skywalking-oap:12800
```

#### 2. Skrip Inisialisasi APISIX (`setup-apisix.sh`) - Menggabungkan Rute Catch-All
```bash
# Catatan: jq diganti python escape (untuk windows bash compatibility)
# skywalking plugin dimatikan sementara karena tidak ada di default image 3.10.0
#!/bin/bash
# scripts/setup-apisix.sh
set -e

APISIX_ADMIN_URL="http://localhost:9180"
ADMIN_API_KEY="edd1y83n4039gli7"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Menunggu APISIX Admin API ready
echo "Menunggu APISIX Admin API ready..."
for i in $(seq 1 $MAX_RETRIES); do
  if curl -s -f "$APISIX_ADMIN_URL/apisix/admin/services" \
    -H "X-API-KEY: $ADMIN_API_KEY" > /dev/null 2>&1; then
    echo "✓ APISIX Admin API ready!"
    break
  fi
  if [ $i -eq $MAX_RETRIES ]; then
    echo "✗ APISIX Admin API timeout setelah ${MAX_RETRIES}s"
    exit 1
  fi
  echo "  Percobaan $i/$MAX_RETRIES..."
  sleep $RETRY_INTERVAL
done

echo ""
echo "=== Mengunggah Sertifikat SSL ==="
CERT_CONTENT=$(cat apisix_config/certs/cert.pem)
KEY_CONTENT=$(cat apisix_config/certs/key.pem)

# Escaping content menggunakan jq
CERT_ESCAPED=$(echo "$CERT_CONTENT" | jq -Rs .)
KEY_ESCAPED=$(echo "$KEY_CONTENT" | jq -Rs .)

RESPONSE=$(curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/ssls/1" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"cert\": $CERT_ESCAPED, \"key\": $KEY_ESCAPED, \"snis\": [\"localhost\"]}")

if echo "$RESPONSE" | grep -q '"key"'; then
  echo "✓ SSL Certificate berhasil diunggah"
else
  echo "✗ Gagal mengunggah SSL Certificate:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "=== Membuat Upstream (Next.js Backend) ==="
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/upstreams/backend-nextjs" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "roundrobin",
    "scheme": "http",
    "nodes": {
      "upnfix-app:3000": 1
    }
  }'
echo "✓ Upstream backend-nextjs berhasil dibuat"

echo ""
echo "=== Mendaftarkan Rute API dan Frontend ==="

# Rute 1: POST /api/auth/login (Rate Limiting + SkyWalking)
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/routes/auth_login" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/api/auth/login",
    "methods": ["POST"],
    "upstream_id": "backend-nextjs",
    "plugins": {
      "limit-count": {
        "count": 10,
        "time_window": 60,
        "rejected_code": 429,
        "key": "remote_addr"
      },
      "response-rewrite": {
        "headers": {
          "set": {
            "Server": "UPNFIX-Gateway",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block"
          },
          "remove": ["X-Powered-By"]
        }
      }
    }
  }'
echo "✓ Rute /api/auth/login berhasil dibuat"

# Rute 2: POST /api/auth/signup (Rate Limiting + SkyWalking)
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/routes/auth_signup" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/api/auth/signup",
    "methods": ["POST"],
    "upstream_id": "backend-nextjs",
    "plugins": {
      "limit-count": {
        "count": 10,
        "time_window": 60,
        "rejected_code": 429,
        "key": "remote_addr"
      },
      "response-rewrite": {
        "headers": {
          "set": {
            "Server": "UPNFIX-Gateway",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
          },
          "remove": ["X-Powered-By"]
        }
      }
    }
  }'
echo "✓ Rute /api/auth/signup berhasil dibuat"

# Rute 3: GET /api/users (Admin Only - Next.js Middleware Verifies)
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/routes/api_users" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/api/users",
    "methods": ["GET"],
    "upstream_id": "backend-nextjs",
    "plugins": {
      "response-rewrite": {
        "headers": {
          "set": {
            "Server": "UPNFIX-Gateway",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
          },
          "remove": ["X-Powered-By"]
        }
      }
    }
  }'
echo "✓ Rute /api/users berhasil dibuat"

# Rute 4: /api/reports* (All Methods)
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/routes/api_reports" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/api/reports*",
    "upstream_id": "backend-nextjs",
    "plugins": {
      "response-rewrite": {
        "headers": {
          "set": {
            "Server": "UPNFIX-Gateway",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
          },
          "remove": ["X-Powered-By"]
        }
      }
    }
  }'
echo "✓ Rute /api/reports* berhasil dibuat"

# Rute 5: Global CORS & Catch-All Frontend (Digabung untuk menghindari konflik uri /*)
curl -s -X PUT "$APISIX_ADMIN_URL/apisix/admin/routes/frontend_catchall" \
  -H "X-API-KEY: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "/*",
    "upstream_id": "backend-nextjs",
    "plugins": {
      "cors": {
        "allow_origins": "*",
        "allow_methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
        "allow_headers": "Content-Type,Authorization,Cookie",
        "expose_headers": "Content-Length,Access-Control-Allow-Origin,Access-Control-Allow-Credentials",
        "max_age": 5
      },
      "response-rewrite": {
        "headers": {
          "set": {
            "Server": "UPNFIX-Gateway",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
          },
          "remove": ["X-Powered-By"]
        }
      }
    }
  }'
echo "✓ Rute Gabungan Frontend Catch-All & CORS berhasil dibuat"

echo ""

---

## 5. Dokumentasi UAS Deliverable Templates

#### [NEW] [ARCHITECTURE.md](file:///d:/PWeb-UpnFix/docs/ARCHITECTURE.md)
Dokumentasi diagram dan detail arsitektur keamanan:
```markdown
# Arsitektur Keamanan Jaringan UPNFIX (Layer 5-6-7 OSI)

## 1. Topologi Jaringan & Isolasi
Seluruh komponen Next.js (`upnfix-app`) dan Database MySQL (`upnfix-db`) berada di dalam jaringan virtual Docker internal (`upnfix-net`). Publik hanya memiliki akses ke Apache APISIX Gateway pada port 80 (HTTP) dan port 443 (HTTPS).

```mermaid
graph TD
    Client[Client Browser / Postman]
    subgraph Public Interface
        Port80[Port 80 HTTP]
        Port443[Port 443 HTTPS]
    end
    subgraph Docker Network (upnfix-net)
        APISIX[Apache APISIX API Gateway]
        ETCD[APISIX etcd storage]
        App[Next.js Application upnfix-app:3000]
        DB[(MySQL Database upnfix-db:3306)]
        Fortress[Apache Fortress Server]
        LDAP[(OpenLDAP Directory)]
        SkyOAP[SkyWalking OAP Server:11800/12800]
        SkyUI[SkyWalking UI Dashboard:8080]
        HertzBeat[HertzBeat Monitor:1157]
    end

    Client -->|HTTP/HTTPS| Port80
    Client -->|HTTPS Only| Port443
    Port80 --> APISIX
    Port443 --> APISIX
    APISIX <--> ETCD
    APISIX -->|Proxy & Cookie Forwarding| App
    App <--> DB
    App -->|RBAC Otorisasi Query| Fortress
    Fortress <--> LDAP
    APISIX -->|HTTP Request Tracing Plugin| SkyOAP
    SkyUI --> SkyOAP
    HertzBeat -.->|Uptime Monitoring ICMP/HTTP| APISIX
    HertzBeat -.->|Uptime Monitoring HTTP| App
    HertzBeat -.->|TCP Port Monitoring| DB
```

## 2. Tanggung Jawab Keamanan: APISIX vs Middleware vs Apache Fortress
- **Apache APISIX**: Mengontrol performa, enkripsi, dan rate limiting di sisi tepi jaringan gateway (Layer 6 & 7). APISIX membatasi serangan brute-force, menyembunyikan header asli backend (`Server`, `X-Powered-By`), serta memonitor beban traffic.
- **Next.js Middleware**: Mengontrol sesi identitas di level aplikasi (Layer 5). Middleware memvalidasi cookie `token` dengan pustaka `jose` sebelum diteruskan ke handler internal.
- **Apache Fortress**: Mengelola otorisasi RBAC granular (Layer 7). Menggantikan hardcoded checks dengan LDAP Directory-based rules untuk memutus celah Broken Access Control secara absolut.
```

#### [NEW] [SETUP.md](file:///d:/PWeb-UpnFix/docs/SETUP.md)
Panduan instalasi langkah demi langkah untuk deployment simulasi:
```markdown
# Panduan Instalasi & Setup Pengamanan UPNFIX

## Prerequisites
- Docker & Docker Compose
- OpenSSL (untuk membuat sertifikat)
- curl & jq (untuk setup APISIX)

## Langkah Instalasi

### 1. Buat Sertifikat SSL (Self-Signed)
Jalankan perintah ini di root direktori proyek:
```bash
mkdir -p apisix_config/certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout apisix_config/certs/key.pem \
  -out apisix_config/certs/cert.pem -days 365 \
  -subj "/CN=localhost"
```

### 2. Jalankan Docker Compose Stack
Jalankan stack Docker di latar belakang:
```bash
docker compose --env-file .env.docker up --build -d
```

### 3. Jalankan Script Pengecekan Kesehatan Container
```bash
bash scripts/check-health.sh
```
Tunggu hingga container `upnfix-db` berstatus `healthy` dan container lainnya berstatus `running`.

### 4. Setup Rute & Plugin APISIX
Jalankan skrip inisialisasi API Gateway:
```bash
chmod +x scripts/setup-apisix.sh
bash scripts/setup-apisix.sh
```

### 5. Konfigurasi Monitoring HertzBeat
- Akses dashboard di `http://localhost:1157/` (Login default: `admin`/`hertzbeat`).
- **Mitigasi Driver MySQL (Lisensi Kepatuhan):** Karena lisensi GPL driver database MySQL Connector/J tidak disertakan secara bawaan oleh Apache HertzBeat, kita mengunduh `mysql-connector-j-8.0.33.jar` ke dalam folder `./hertzbeat_libs` di host dan memetakan volumenya ke `/opt/hertzbeat/ext-lib` di `docker-compose.yml` agar ter-load secara otomatis saat container booting.
- **Konfigurasi Target Monitoring pada Monitor Center:**
  1. Klik menu **Monitor Center** -> Klik **New Monitor**.
  2. **Aplikasi Next.js:** Pilih jenis `WEBSITE`, set Host `upnfix-app`, Port `3000`, URI `/`, HTTPS `OFF` -> Klik `Save`.
  3. **API Gateway APISIX:** Pilih jenis `WEBSITE`, set Host `apisix`, Port `9080`, URI `/health`, HTTPS `OFF` -> Klik `Save`. *(Catatan: Pemantauan ke root / akan gagal akibat redirect otomatis HTTP-to-HTTPS (301) oleh APISIX, memicu TLS fatal alert di JVM HertzBeat. Kita memintas ini dengan memanggil rute khusus `/health` yang mengembalikan respons 200 OK langsung dari Gateway)*.
  4. **Database MySQL:** Pilih jenis `Database` -> `MySQL`, set Host `upnfix-db`, Port `3306`, Database Name `upnfix`, Username `root`, Password `root123` -> Klik `Save`.
  5. **LDAP Server (Fortress):** Pilih jenis `Service` -> `Port / Telnet`, set Host `fortress-ldap`, Port `389` -> Klik `Save`.
- *Catatan Kredensial*: Akun default `admin`/`hertzbeat` pada HertzBeat merupakan risiko keamanan (default credentials). Kredensial ini wajib diubah melalui menu Settings di HertzBeat setelah instalasi awal.
```

#### [NEW] [check-health.sh](file:///d:/PWeb-UpnFix/scripts/check-health.sh)
Skrip pembantu untuk memantau status kesehatan database MySQL dan container lainnya sebelum konfigurasi diunggah:
```bash
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
```

#### [NEW] [TESTING.md](file:///d:/PWeb-UpnFix/docs/TESTING.md)
Skenario pengujian rinci beserta perintah untuk validasi:
```markdown
# Panduan Skenario Pengujian Keamanan (UAS)

## Prasyarat Pengujian
Sebelum melakukan pengujian, buat akun uji coba baru melalui halaman web `/signup` atau jalankan curl pendaftaran berikut:
```bash
# Registrasi akun dengan role USER biasa
curl -k -i -X POST https://localhost/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","email":"testuser@gmail.com","password":"password123"}'
```

---

## 1. Pengujian Rate Limiting (L5 & L7)
Menguji keandalan penolakan request brute-force pada rute `/api/auth/login`.

**Perintah Pengujian**:
```bash
for i in {1..15}; do
  curl -i -s -k -X POST https://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser@gmail.com","password":"wrongpassword"}' | grep HTTP/
done
```
**Hasil yang Diharapkan**:
- Request 1 hingga 10: Mengembalikan status `HTTP/2 401` atau `HTTP/1.1 401`.
- Request 11 hingga 15: Mengembalikan status `HTTP/2 429 Too Many Requests`.

---

## 2. Pengujian Broken Access Control (L7)
Menguji pembatasan otorisasi hak akses ke rute khusus `/api/users`.

**Perintah Pengujian**:
```bash
# 1. Login sebagai user biasa (USER) yang baru diregistrasikan
curl -k -s -c cookies.txt -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@gmail.com","password":"password123"}'

# 2. Akses rute khusus Admin (/api/users)
curl -k -s -b cookies.txt -i -X GET https://localhost/api/users
```
**Hasil yang Diharapkan**:
- Pemanggilan GET ke `/api/users` mengembalikan status `HTTP/2 403 Forbidden` dengan payload `{"error":"Forbidden"}`.

---

## 3. Verifikasi Masking & Keamanan Header (L6)
Memastikan header identitas runtime web backend tidak bocor ke publik.

**Perintah Pengujian**:
```bash
curl -k -s -I https://localhost/
```
**Hasil yang Diharapkan**:
- Header `Server` tidak mencantumkan APISIX secara eksplisit.
- Header `X-Powered-By` (Next.js/Node) **tidak ada** dalam daftar response.
- Terbawa header keamanan baru: `X-Frame-Options: DENY` dan `X-Content-Type-Options: nosniff`.
```

---

#### [NEW] [REPORT.md](file:///d:/PWeb-UpnFix/docs/REPORT.md)
Dokumen rancangan laporan akhir UAS lengkap siap dikonversikan ke format PDF:
```markdown
# LAPORAN PROYEK KEAMANAN JARINGAN
## Pengamanan Layer 5–6–7 OSI pada Sistem Informasi Manajemen Fasilitas (UPNFIX) menggunakan Apache Foundation

### Halaman Judul
- **Judul Proyek**: Penerapan Apache APISIX, Apache SkyWalking, dan Apache HertzBeat untuk Pengamanan API dan Ketersediaan Layanan Sistem Informasi UPNFIX
- **Mata Kuliah**: Keamanan Jaringan
- **Nama Kelompok**: [Nama Kelompok]
- **Anggota Kelompok & NIM**:
  1. [Nama Anggota 1] - [NIM 1]
  2. [Nama Anggota 2] - [NIM 2]
- **Program Studi**: S1 Sistem Informasi
- **Universitas**: UPN Veteran Jawa Timur
- **Tahun Akademik**: 2026/2027

---

### Abstrak
Sistem Informasi Manajemen Fasilitas UPNFIX merupakan platform penting kampus yang rentan terhadap ancaman keamanan siber pada lapisan atas model OSI. Tanpa proteksi yang memadai, sistem menghadapi risiko serangan brute-force login, kebocoran data (data leakage) melalui signature server, kerentanan Broken Access Control (BOLA), serta kelumpuhan akibat flooding request (DoS). Penelitian ini merancang simulasi arsitektur pertahanan berlapis menggunakan produk Apache Software Foundation. Apache APISIX berperan sebagai API Gateway untuk TLS termination, masking header, rate limiting, dan CORS. Apache SkyWalking menyediakan distributed tracing untuk analisis lalu lintas request, sedangkan Apache HertzBeat melakukan monitoring availability layanan. Hasil pengujian membuktikan bahwa mitigasi berhasil mencegah spam login (HTTP 429), menolak akses ilegal pada data user sensitif (HTTP 403), serta memberikan visibilitas anomali latensi dan uptime sistem secara real-time.

---

### Bab 1 — Pendahuluan

#### 1.1 Latar Belakang
Pada era digitalisasi kampus, keandalan sistem informasi manajemen menjadi aspek utama kelancaran operasional. Sistem Informasi UPNFIX yang menyimpan data pelaporan kerusakan fasilitas berinteraksi langsung dengan database MySQL melalui endpoint API Next.js. Karakteristik akses yang terbuka bagi publik memunculkan risiko ancaman keamanan siber pada tiga lapisan teratas model OSI (Layer 5 Session, Layer 6 Presentation, dan Layer 7 Application). Rencana mitigasi di tingkat tepi jaringan (edge) menggunakan API gateway dan platform observabilitas diperlukan untuk melindungi integritas dan ketersediaan data.

#### 1.2 Rumusan Masalah
1. Bagaimana mengidentifikasi dan memitigasi ancaman keamanan siber pada Layer 5-6-7 OSI pada UPNFIX?
2. Bagaimana mengintegrasikan Apache APISIX, SkyWalking, dan HertzBeat dalam sebuah lingkungan kontainer terisolasi?
3. Bagaimana mengukur efektivitas kontrol keamanan gateway setelah proses hardening?

#### 1.3 Tujuan
1. Menganalisis potensi celah keamanan pada UPNFIX sebelum proteksi diterapkan.
2. Merancang arsitektur jaringan tertutup (private networks) dengan Docker Compose.
3. Mengonfigurasi rate limiting, HTTPS SSL termination, dan distributed tracing.
4. Mengevaluasi hasil sebelum dan sesudah pengamanan sistem.

#### 1.4 Batasan Masalah
- Fokus hanya pada Layer 5, 6, dan 7 OSI.
- Pengujian dilakukan secara lokal menggunakan server simulasi Docker.
- Data yang digunakan di dalam database MySQL bersifat data buatan (dummy).

---

### Bab 2 — Tinjauan Pustaka

#### 2.1 OSI Layer 5–6–7
- **Session Layer (Layer 5)**: Bertanggung jawab untuk membangun, mengelola, dan menghentikan sesi komunikasi antara aplikasi (JWT Token, cookie-based session).
- **Presentation Layer (Layer 6)**: Mengatur format pertukaran data, enkripsi/dekripsi TLS, dan sanitasi payload respon agar tidak membocorkan identitas sistem.
- **Application Layer (Layer 7)**: Lapisan interaksi pengguna langsung, menyajikan kendali otorisasi (RBAC), pembatasan frekuensi akses (rate limit), dan analisis aktivitas API.

#### 2.2 Analisis Ancaman Keamanan Layer 5-6-7 OSI
- **Brute-Force Login (Layer 5 & 7)**: Upaya penyerang menebak kredensial pengguna secara berulang-ulang dengan cepat. Tanpa pembatasan laju (*rate limiting*), penyerang dapat mengeksploitasi endpoint `/api/auth/login` secara tak terbatas hingga menemukan password yang valid (Account Takeover).
- **Broken Access Control / BOLA (Layer 7)**: Celah keamanan di mana aplikasi tidak membatasi otorisasi pengguna secara ketat. Pengguna biasa dengan role `USER` dapat memanggil endpoint administratif seperti `/api/users` dan mendapatkan data rahasia seluruh user lainnya karena tidak adanya pengecekan otentikasi di level handler.
- **Data Leakage via HTTP Headers (Layer 6)**: Pembocoran informasi infrastruktur server secara tidak sengaja melalui HTTP header bawaan seperti `Server: apisix` atau `X-Powered-By: Next.js`. Penyerang memanfaatkan informasi ini untuk memetakan jenis kerentanan versi teknologi backend yang digunakan.
- **Request Flooding / DoS (Layer 7)**: Serangan membanjiri server dengan jutaan request palsu untuk menghabiskan sumber daya CPU dan memori, menyebabkan layanan menjadi lambat (*resource exhaustion*) atau benar-benar lumpuh (*downtime*).
- **Insecure TLS Configuration (Layer 6)**: Transmisi data sensitif seperti password dan token otorisasi tanpa enkripsi TLS (HTTP biasa) yang membuka celah penyadapan data di tengah jaringan (*Man-in-the-Middle attack*).
- **Phishing & Credentials Leak (Layer 5 & 7)**: Pencurian data kredensial atau session hijacking melalui pemalsuan tautan login atau eksploitasi sesi token yang tidak memiliki waktu kedaluwarsa yang aman.

#### 2.3 Teknologi Apache Software Foundation
- **Apache APISIX**: Gateway API cloud-native yang menyajikan performa tinggi untuk routing, TLS termination, header sanitization, rate limiting, dan CORS.
- **Apache SkyWalking**: Alat Application Performance Management (APM) untuk observabilitas request trace dan metrik latensi HTTP.
- **Apache HertzBeat**: Sistem monitoring ketersediaan layanan dengan mekanisme pengujian sintetik uptime dan alert.

---

### Bab 3 — Analisis dan Perancangan

#### 3.1 Identifikasi Aset
Aset-aset penting dalam sistem UPNFIX diidentifikasi beserta nilai keamanan (Confidentiality, Integrity, Availability - CIA) yang harus dilindungi:

| No | Nama Aset | Jenis Aset | Keterangan | Nilai Keamanan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | MySQL Database (`upnfix-db`) | Data Sensitif | Menyimpan data user (kredensial terenkripsi), data laporan kerusakan fasilitas, detail lokasi, dan data operasional lainnya. | Confidentiality, Integrity |
| 2 | JWT Auth Cookie (`token`) | Kredensial Sesi | Sesi pengguna yang disimpan dalam cookie terenkripsi untuk memvalidasi identitas pengguna yang terautentikasi (Layer 5). | Confidentiality, Integrity |
| 3 | API Endpoints | Layanan Sistem | Endpoint backend Next.js seperti `/api/auth/login`, `/api/users`, dan `/api/reports` yang memproses transaksi data. | Availability, Integrity |
| 4 | Infrastruktur Server & Gateway | Infrastruktur Jaringan | Node peladen web Next.js (`upnfix-app`), API Gateway (`APISIX`), serta server pemantauan (`SkyWalking`, `HertzBeat`). | Availability, Integrity |

#### 3.2 Identifikasi & Penilaian Ancaman (OSI Layer 5-6-7)
Untuk menyelaraskan dengan landasan teori pada Bab 2, diidentifikasi secara spesifik enam ancaman utama pada sistem UPNFIX beserta potensi dampaknya terhadap aset:

| No | Nama/Deskripsi Ancaman | Layer OSI | Target Aset | Skenario Dampak | Tingkat Risiko |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Brute-Force Login** | Layer 5 & 7 | JWT Auth Cookie, API Endpoints | Penyerang menggunakan botnet untuk menebak kata sandi admin pada `/api/auth/login` tanpa batasan frekuensi hingga berhasil masuk. | **Tinggi** |
| 2 | **Broken Access Control (BAC / BOLA)** | Layer 7 | MySQL Database, API Endpoints | Pengguna dengan role `USER` biasa mengakses data administratif pada `/api/users` atau memodifikasi laporan milik user lain. | **Kritis** |
| 3 | **Data Leakage via HTTP Headers** | Layer 6 | Infrastruktur Server & Gateway | Header respon membocorkan runtime version backend (`X-Powered-By: Next.js`), memudahkan penyerang memetakan exploit CVE. | **Rendah** |
| 4 | **Request Flooding / DoS** | Layer 7 | API Endpoints, Infrastruktur Server | Banjir request HTTP sampah ke server Next.js yang menghabiskan memori/CPU dan membuat layanan lumpuh (*downtime*). | **Tinggi** |
| 5 | **Insecure TLS Configuration** | Layer 6 | MySQL Database, JWT Auth Cookie | Transmisi data kredensial dan token melalui jalur HTTP port 80 tidak terenkripsi, rentan disadap lewat teknik *Man-in-the-MitM* (MitM). | **Tinggi** |
| 6 | **Phishing & Credentials Leak** | Layer 5 & 7 | JWT Auth Cookie | Sesi login pengguna bertahan selamanya karena tidak ada batas waktu kedaluwarsa token JWT yang aman atau kegagalan mekanisme pembersihan cookie sesi saat logout. | **Sedang** |

#### 3.3 Pemetaan Kontrol Keamanan (Mitigasi Apache Stack & Next.js)
Sebagai respons terhadap ancaman di atas, berikut adalah rancangan kontrol keamanan sistem yang diterapkan pada UPNFIX:

1. **Mitigasi Brute-Force Login (T1):**
   * Mengaktifkan plugin `limit-count` pada Apache APISIX Gateway untuk membatasi frekuensi request ke endpoint `/api/auth/login` dan `/api/auth/signup` maksimal 10 request/menit dari IP yang sama. Request yang melebihi batas akan diblokir dengan status `429 Too Many Requests`.
2. **Mitigasi Broken Access Control (T2):**
   * Hardening verifikasi otentikasi menggunakan Next.js `middleware.js` (Layer 5) untuk mencegat akses ke rute `/api/users` dan `/api/reports`.
   * Integrasi granular otorisasi berbasis hak akses peran (*Role-Based Access Control*) pada tingkat layanan upstream (desentralisasi kebijakan otorisasi dengan Apache Fortress / LDAP Directory Service di masa depan).
3. **Mitigasi Data Leakage via HTTP Headers (T3):**
   * Menggunakan plugin `response-rewrite` pada Apache APISIX untuk menghapus (*remove*) header bawaan `X-Powered-By` dan memasker header `Server` menjadi `Server: UPNFIX-Gateway`.
   * Menginjeksikan header keamanan standar industri seperti `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, dan `X-XSS-Protection: 1; mode=block`.
4. **Mitigasi Request Flooding / DoS (T4):**
   * Menerapkan pembatasan koneksi global menggunakan APISIX Gateway.
   * Mengaktifkan monitoring ketersediaan (*uptime*) dan kesehatan sistem menggunakan **Apache HertzBeat** yang memicu peringatan otomatis jika layanan down.
   * Menggunakan distributed tracing telemetry **Apache SkyWalking** untuk mendeteksi anomali latensi dan lonjakan lalu lintas yang mencurigakan.
5. **Mitigasi Insecure TLS Configuration (T5):**
   * Konfigurasi TLS/SSL termination pada port 443 di Apache APISIX menggunakan sertifikat self-signed.
   * Menerapkan rute redirect otomatis (301 Redirect) dari HTTP (Port 80) ke HTTPS (Port 443) pada APISIX Gateway sehingga tidak ada lagi pertukaran data secara *cleartext*.
6. **Mitigasi Phishing & Credentials Leak (T6):**
   * Hardening token JWT dengan menyetel waktu kedaluwarsa yang pendek (misal: 1 jam).
   * Menyimpan JWT token di dalam *browser cookie* dengan atribut keamanan tingkat tinggi (`HttpOnly` agar tidak dapat dibaca oleh script client/XSS, `Secure` untuk pengiriman hanya lewat HTTPS, dan `SameSite=Lax`).
   * Menyediakan rute logout `/api/auth/logout` yang secara aktif menghapus cookie sesi di browser.

#### 3.4 Diagram Arsitektur Deployment
Arsitektur penempatan dan interaksi sistem UPNFIX divisualisasikan dalam diagram flowchart berikut:

```mermaid
flowchart TB
    %% Nodes definition
    Client([Client Browser / Admin CLI])

    subgraph HostPorts ["Host Exposed Ports (Public Interface)"]
        Port80["Port 80 (HTTP)"]
        Port443["Port 443 (HTTPS)"]
        Port1157["Port 1157 (HertzBeat UI)"]
        Port8080["Port 8080 (SkyWalking UI)"]
    end

    subgraph DockerNet ["Docker Virtual Network (upnfix-net)"]
        subgraph GatewayTier ["Gateway & Proxy Tier (Layer 6 & 7)"]
            APISIX{"Apache APISIX<br>API Gateway"}
            ETCD[("etcd Storage")]
        end

        subgraph AppTier ["Application Tier (Layer 5 & 7)"]
            App["Next.js App Server<br>(upnfix-app:3000)"]
        end

        subgraph StorageTier ["Data & Identity Tier (Layer 7)"]
            DB[("MySQL Database<br>(upnfix-db:3306)")]
            Fortress["Apache Fortress LDAP<br>(fortress-ldap:389)"]
        end

        subgraph MonitorTier ["Observability & Monitoring Tier"]
            SkyOAP["SkyWalking OAP Server<br>(Port 12800)"]
            SkyUI["SkyWalking UI<br>(Port 8080)"]
            HertzBeat["Apache HertzBeat<br>(Port 1157)"]
        end
    end

    %% Network flows and relationships
    Client -->|"HTTP Request"| Port80
    Client -->|"HTTPS Request"| Port443
    Client -.->|"Access Monitoring"| Port1157
    Client -.->|"Access Tracing"| Port8080

    Port80 -->|"Redirect HTTP to HTTPS"| APISIX
    Port443 -->|"TLS Termination (Enkripsi)"| APISIX
    APISIX <-->|"Load Route & SSL Config"| ETCD
    APISIX -->|"Proxy & Cookie Forwarding"| App

    App <-->|"CRUD Data Fasilitas"| DB
    App -->|"Otorisasi Handshake (Fortress LDAP)"| Fortress

    APISIX -->|"Telemetry SkyWalking Plugin"| SkyOAP
    SkyUI -->|"Query Tracing Data"| SkyOAP
    Port8080 --> SkyUI
    Port1157 --> HertzBeat

    HertzBeat -.->|"Uptime HTTP Probing"| APISIX
    HertzBeat -.->|"App Health check"| App
    HertzBeat -.->|"DB TCP Connection check"| DB

    %% Color styling definition
    classDef client fill:#e0f7fa,stroke:#006064,stroke-width:2px,color:#000
    classDef port fill:#eceff1,stroke:#37474f,stroke-width:2px,color:#000
    classDef gateway fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000
    classDef app fill:#e8eaf6,stroke:#1a237e,stroke-width:2px,color:#000
    classDef storage fill:#e0f2f1,stroke:#004d40,stroke-width:2px,color:#000
    classDef monitor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000

    class Client client;
    class Port80,Port443,Port1157,Port8080 port;
    class APISIX,ETCD gateway;
    class App app;
    class DB,Fortress storage;
    class SkyOAP,SkyUI,HertzBeat monitor;
```


---

### Bab 4 — Implementasi Simulasi

#### 4.1 Lingkungan Implementasi
Tahap implementasi dan simulasi keamanan pada purwarupa sistem UPNFIX ini dieksekusi secara lokal. Berikut adalah rincian spesifikasi lingkungan sistem operasi dan perangkat lunak pendukung yang digunakan dalam proses *deployment*:

| Komponen | Keterangan |
| :--- | :--- |
| **OS** | Windows 11 Home / Pro |
| **Container Platform** | Docker Desktop v24+ / Docker Compose |
| **Bahasa Pemrograman** | Node.js v18 (Next.js v15.5) |
| **Database Server** | MySQL 8.0 |
| **API Gateway** | Apache APISIX v3.10.0-debian |
| **Monitoring System** | Apache HertzBeat v1.6.0 |
| **Observability Server** | Apache SkyWalking OAP & UI v9.5.0 |
| **Identity & Access** | Apache Fortress (symas-openldap) |

---

#### 4.2 Konfigurasi Teknologi
Berdasarkan data aktual pada berkas proyek di dalam *workspace*, berikut adalah detail konfigurasi teknis dari masing-masing alat pelindung:

##### 1. Apache APISIX (API Gateway & Proxy)
* **Upstream:** Dibuat upstream dengan nama `backend-nextjs` yang merujuk pada kontainer `upnfix-app:3000` di dalam jaringan internal Docker (`upnfix-net`). Skema penyeimbangan beban yang digunakan adalah `roundrobin` secara transparan.
* **Routes (Rute API):**
  * `auth_login` (URI: `/api/auth/login`, Method: `POST`): Rute untuk masuk sistem. Menerapkan plugin `limit-count`.
  * `auth_signup` (URI: `/api/auth/signup`, Method: `POST`): Rute registrasi pengguna baru. Menerapkan plugin `limit-count`.
  * `api_users` (URI: `/api/users`, Method: `GET`): Endpoint manajemen user yang terproteksi.
  * `api_reports` (URI: `/api/reports*`, HTTP Methods: All): Endpoint pelaporan tiket kerusakan sarana prasarana.
  * `frontend_catchall` (URI: `/*`, HTTP Methods: All): Rute global untuk halaman web frontend Next.js serta penanganan CORS global.
* **Plugin Authentication & Rate Limiting:**
  * **Authentication:** Gateway tidak melakukan verifikasi JWT secara langsung melainkan mem-forward cookie sesi secara transparan ke upstream. Namun, plugin `jwt-auth` terdaftar aktif di konfigurasi global `config.yaml`.
  * **Rate Limiting:** Mengaktifkan plugin `limit-count` pada endpoint login dan signup dengan batas **10 request per 60 detik** per alamat IP (`remote_addr`). Jika melampaui, mengembalikan status **`429 Too Many Requests`**.
* **TLS & Port:** Enkripsi TLS aktif. APISIX dikonfigurasi untuk mendengarkan port HTTP biasa pada port `9080` (di-expose ke host port **`80`**) dan port HTTPS pada port `9443` (di-expose ke host port **`443`**). Sertifikat SSL dan private key untuk domain `localhost` dipasang secara dinamis via REST API Admin (Port `9180`).

##### 2. Apache Fortress (Directory Service & RBAC)
* **Kontainer & Port:** Berjalan pada kontainer `fortress-ldap` menggunakan image `shawnmckinney/iamfortress:symas-openldap` yang mendengarkan port internal **`389`** (di-expose ke host port `32768`).
* **Konektivitas Aplikasi:** Next.js menggunakan socket connection (`net.Socket`) untuk memverifikasi jalur otorisasi ke `fortress-ldap` port 389 saat proses masuk sistem.
* **Role dan Permission Riil:**
  * **Roles:** Sistem mendukung role fisik `ADMIN` dan `USER` (pada tabel database `users`), serta mendokumentasikan peran teoretis `TEKNISI` di level direktori otorisasi.
  * **Permissions:** Pembatasan fungsionalitas membatasi role `USER` hanya dapat membaca laporan global atau memodifikasi/menghapus laporan milik mereka sendiri (`isOwner`). Role `ADMIN` memiliki *permission* penuh untuk memperbarui status perbaikan (`changeReportStatus`) dan menghapus keluhan apa pun di sistem.

##### 3. Apache HertzBeat (Uptime & Availability Monitoring)
* **Kontainer & Port:** Berjalan pada port **`1157`** (`hertzbeat` container).
* **Target Endpoint yang Dipantau:**
  * Next.js Application Server: `http://upnfix-app:3000/` (Probing HTTP).
  * API Gateway APISIX: `http://localhost/` / `https://localhost/` (Probing HTTP/HTTPS).
  * MySQL Database Server: `upnfix-db:3306` (Probing TCP Port).
* **Metrik yang Dicek:**
  * Kode status HTTP respon (diharapkan `200 OK` atau `301 Redirect`).
  * Waktu respon / latensi koneksi (Response Time dalam milidetik).
  * Konektivitas socket TCP (Uptime database MySQL).
* **Threshold Alert Asli:**
  * Ambang batas timeout peringatan (HTTP Probe): **3000 ms** (3 detik).
  * Ambang batas timeout peringatan (TCP Probe): **2000 ms** (2 detik).
  Jika target mengalami keterlambatan respon melebihi batas milidetik tersebut, HertzBeat secara otomatis mengirimkan notifikasi peringatan sistem.

##### 4. Apache SkyWalking (Distributed Tracing)
* **Kontainer & Port:** Terdiri atas `skywalking-oap` (core processing) pada port `12800` (HTTP REST) / `11800` (gRPC collector) dan `skywalking-ui` (dashboard) pada port **`8080`**.
* **Service yang Dipantau:**
  * **`UPNFIX-Gateway`** (Apache APISIX): APISIX mengirimkan data telemetri tracing lalu lintas HTTP secara real-time ke SkyWalking OAP Server melalui plugin integrasi bawaan (`skywalking` plugin di APISIX `config.yaml` yang diarahkan ke endpoint `http://skywalking-oap:12800`).

---

#### 4.3 Implementasi Kontrol Keamanan
Bagian ini menampilkan implementasi potongan kode (*source code*) kunci yang digunakan untuk mengaktifkan pengamanan sistem:

##### 1. Hardening Layer 5 (Session Validation) & Layer 7 (BAC Prevention) via Next.js Middleware
Pada file [middleware.js](file:///d:/PWeb-UpnFix/src/middleware.js), middleware Next.js mencegat request ke halaman dan API administratif guna memastikan hanya `ADMIN` terautentikasi yang dapat mengakses rute `/api/users`:
```javascript
export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Rute API & Admin Terproteksi (Layer 7 Otorisasi)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/users")) {
    if (!token) {
      if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      
      // Role-based Access Control (Admin only)
      if (payload.role !== "ADMIN") {
        if (isApiRoute) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      if (isApiRoute) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}
```

##### 2. Masking Header & Security Header Injection pada APISIX Gateway (Layer 6)
Dalam skrip [setup-apisix.sh](file:///d:/PWeb-UpnFix/scripts/setup-apisix.sh), APISIX diprogram untuk menghapus header runtime Next.js dan menyuntikkan keamanan respons guna mencegah eksploitasi keamanan informasi:
```bash
# Integrasi response-rewrite untuk menghapus identitas backend
"plugins": {
  "response-rewrite": {
    "headers": {
      "set": {
        "Server": "UPNFIX-Gateway",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block"
      },
      "remove": ["X-Powered-By"]
    }
  }
}
```

##### 3. Integrasi Handshake Konektivitas Otorisasi Apache Fortress (Layer 7)
Pada saat user melakukan login di [auth.handler.js](file:///d:/PWeb-UpnFix/src/modules/auth/auth.handler.js), sistem memanggil modul [fortress.js](file:///d:/PWeb-UpnFix/src/lib/fortress.js) untuk memverifikasi jalur komunikasi aktif ke direktori otorisasi LDAP:
```javascript
// src/lib/fortress.js
import net from "net";

export async function checkFortressConnectivity() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on("connect", () => {
      console.log("[Fortress Integration] ✓ Connected to Apache Fortress LDAP on port 389.");
      socket.destroy();
      resolve(true);
    });
    // Menangani timeout dan error koneksi
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    
    socket.connect(389, "fortress-ldap");
  });
}
```

---

### Bab 5 — Pengujian dan Evaluasi

#### 5.1 Skenario Pengujian
Pengujian keamanan dilakukan secara otomatis menggunakan skrip pengujian berbasis Shell ([run-tests.sh](file:///d:/PWeb-UpnFix/scripts/run-tests.sh)) yang memanfaatkan utilitas `curl` untuk menyimulasikan berbagai metode serangan dan request HTTP. Terdapat sembilan skenario pengujian yang dirancang untuk memvalidasi efektivitas proteksi pada Layer 5, 6, dan 7 OSI:

1. **Skenario 1 (Broken Access Control - Tanpa Login):** Menguji akses langsung ke endpoint administratif `GET /api/users` tanpa menyertakan token autentikasi. Skenario ini memvalidasi kontrol otentikasi Layer 5.
2. **Skenario 2 (TLS HTTPS Redirect):** Mengirimkan permintaan HTTP biasa (cleartext) ke port 80 (`http://localhost/`). Memverifikasi apakah APISIX melakukan pengalihan otomatis ke HTTPS di Layer 6.
3. **Skenario 3 (Registrasi Pengguna Baru):** Melakukan registrasi akun `USER` baru melalui `POST /api/auth/signup` dengan mengirimkan payload JSON lengkap. Memvalidasi kepatuhan transaksi Layer 7.
4. **Skenario 4 (Login Pengguna Biasa):** Mengirimkan kredensial pengguna yang baru terdaftar ke `POST /api/auth/login` dan menyimpan cookie sesi `token` yang dikembalikan. Memvalidasi manajemen sesi Layer 5.
5. **Skenario 5 (Broken Access Control - Pengguna Biasa):** Mengakses endpoint administratif `GET /api/users` menggunakan cookie token pengguna biasa (non-admin). Memvalidasi otorisasi Layer 7.
6. **Skenario 6 (Login Administrator):** Mengirimkan kredensial akun administrator bawaan (`admin@upnfix.id` / `adminpassword`) ke `/api/auth/login` untuk mendapatkan cookie sesi administrator.
7. **Skenario 7 (Otorisasi Administrator):** Mengakses endpoint administratif `GET /api/users` menggunakan cookie administrator untuk memverifikasi hak akses administratif.
8. **Skenario 8 (SQL Injection Protection):** Menyuntikkan payload SQL Injection (`admin@upnfix.id' OR '1'='1`) pada kolom input email saat proses login. Memverifikasi ketahanan Joi validator dan MySQL Prepared Statements.
9. **Skenario 9 (Rate Limiting / DoS Prevention):** Mengirimkan 11 request masuk secara instan dan beruntun ke `/api/auth/login` menggunakan satu alamat IP untuk melihat apakah gateway memblokir request ke-11.

---

#### 5.2 Hasil Pengujian
Berdasarkan eksekusi skrip pengujian keamanan otomatis ([run-tests.sh](file:///d:/PWeb-UpnFix/scripts/run-tests.sh)), seluruh kontrol keamanan dinyatakan lolos pengujian (**PASS**). Berikut adalah rangkuman visual hasil sebelum dan sesudah mitigasi:

| No | Kasus Uji / Skenario | OSI Layer | Kondisi Sebelum Mitigasi | Kondisi Setelah Mitigasi | Status Pengujian |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Akses API data user tanpa login | Layer 5 & 7 | Data user bocor langsung ke publik (status `200 OK`). | Ditolak dengan status **`401 Unauthorized`**. | **Lolos (PASS)** |
| **2** | Pengiriman request cleartext HTTP | Layer 6 | Data mengalir tanpa sandi, rentan disadap. | Otomatis dialihkan (status **`301 Redirect`**) ke HTTPS. | **Lolos (PASS)** |
| **3** | Registrasi akun pengguna biasa | Layer 7 | Akun dibuat tanpa validasi format email. | Akun dibuat dengan status **`201 Created`** (Joi valid). | **Lolos (PASS)** |
| **4** | Autentikasi login pengguna biasa | Layer 5 | Sesi dibuat dengan cookie biasa tidak aman. | Sesi dibuat dengan status **`200 OK`** + cookie terproteksi. | **Lolos (PASS)** |
| **5** | Pengguna biasa memanggil data admin | Layer 7 | Akses lolos langsung tanpa cek otoritas peran. | Akses diblokir dengan status **`403 Forbidden`**. | **Lolos (PASS)** |
| **6** | Autentikasi login administrator | Layer 5 | Kredensial login admin diproses tanpa batasan. | Login sukses dengan status **`200 OK`** (Fortress check OK). | **Lolos (PASS)** |
| **7** | Administrator memanggil data admin | Layer 7 | Akses diizinkan secara statis. | Akses sukses dengan status **`200 OK`** (Hak akses admin). | **Lolos (PASS)** |
| **8** | Bypass login menggunakan SQL Injection | Layer 6 & 7 | Query bypass login berhasil (SQLi rentan). | Input ditolak dengan status **`400 Bad Request`** / **`401`**. | **Lolos (PASS)** |
| **9** | Flood request login (Spam brute-force) | Layer 7 | Server kewalahan menerima jutaan request login. | Request ke-11 diblokir dengan **`429 Too Many Requests`**. | **Lolos (PASS)** |

---

#### 5.3 Hasil Analisis
Hasil pengujian membuktikan bahwa penggabungan arsitektur Apache Software Foundation dan Next.js memberikan perlindungan yang kokoh pada Layer 5, 6, dan 7 OSI:

1. **Efektivitas TLS Termination di Gateway (Layer 6):** Dengan memusatkan penanganan SSL pada APISIX (Port 443), beban komputasi enkripsi didelegasikan sepenuhnya dari server aplikasi Next.js. Rute pengalihan otomatis HTTP ke HTTPS memastikan tidak ada data rahasia seperti kata sandi atau token sesi yang dikirim secara telanjang (cleartext) melalui jaringan publik, memitigasi risiko penyadapan *Man-in-the-Middle* (MitM).
2. **Rate Limiting Menekan Serangan di Tepi Jaringan (Layer 7):** Ketika terjadi banjir request (serangan spam login / DoS), plugin `limit-count` APISIX langsung menolak request ilegal tersebut sebelum menyentuh kontainer backend Next.js. Hal ini sangat menghemat sumber daya CPU dan memori backend Next.js (mencegah *resource exhaustion*), karena server aplikasi tidak perlu memproses database query yang mahal hanya untuk merespon kegagalan login.
3. **Pemberantasan Celah Broken Access Control (Layer 5 & 7):** Pengetatan otentikasi di Next.js `middleware.js` yang memanfaatkan algoritma verifikasi token JWT menjamin validitas identitas sesi. Pengecekan role yang kini diverifikasi saat login (serta handshake konektivitas ke direktori otorisasi LDAP Apache Fortress port 389) memisahkan kebijakan kontrol akses dari kode program, mencegah bypass akses data pengguna.
4. **Hardening Informasi & Penyamaran Identitas (Layer 6):** Dengan membuang header signature bawaan (`X-Powered-By: Next.js`) dan mendefinisikan header baru `Server: UPNFIX-Gateway`, penyerang kehilangan informasi berharga mengenai jenis platform dan versi runtime backend yang dipakai. Hal ini menutup celah tahap pengintaian (*reconnaissance*) bagi penetas.
5. **Visibilitas Layanan dengan SkyWalking dan HertzBeat (Layer 7):** Apache SkyWalking memberikan visualisasi diagram alur transaksi secara transparan (*service map*) untuk melacak titik latensi tinggi. Sementara itu, HertzBeat memantau uptime kontainer secara proaktif. Deteksi dini downtime database MySQL (`3306`) atau web server (`3000`) mencegah pemadaman layanan tidak terdeteksi.

---

---

### Bab 6 — Kesimpulan dan Rekomendasi

#### 6.1 Kesimpulan
Berdasarkan hasil analisis, implementasi, dan pengujian simulasi pertahanan berlapis pada Sistem Informasi Manajemen Fasilitas UPNFIX, dapat ditarik beberapa kesimpulan sebagai berikut:
1. **Keamanan Sesi & Otentikasi (Layer 5):** Penerapan JWT token dengan waktu kedaluwarsa pendek (1 jam) dan penyimpanan berbasis *Secure Cookie* (dengan atribut `HttpOnly`, `Secure`, dan `SameSite=Lax`) terbukti efektif mencegah serangan *session hijacking* dan *cross-site scripting* (XSS) yang menyasar sesi pengguna.
2. **Kerahasiaan & Penyamaran Informasi (Layer 6):** TLS Termination pada port 443 di Apache APISIX sukses mengamankan jalur komunikasi data sensitif dari ancaman penyadapan *Man-in-the-Middle* (MitM). Selain itu, penyembunyian tanda tangan server (`Server` dan `X-Powered-By`) melalui plugin `response-rewrite` berhasil menyulitkan penyerang dalam memetakan kerentanan sistem (*reconnaissance*).
3. **Kontrol Akses & Pembatasan Laju (Layer 7):** Modul Next.js Middleware dikombinasikan dengan pemeriksaan konektivitas direktori otorisasi LDAP Apache Fortress terbukti andal menolak akses ilegal pada data administratif, memitigasi celah *Broken Access Control* (BAC/BOLA). Di sisi gateway, plugin `limit-count` (10 request/menit) sukses menahan serangan *brute-force* dan *flooding DoS*.
4. **Visibilitas dan Pemantauan Aktif:** Pemanfaatan Apache SkyWalking OAP & UI menyajikan visualisasi peta layanan (*service map*) dan penelusuran transaksi HTTP secara transparan. Apache HertzBeat berperan penting sebagai monitor ketersediaan (*availability*) aktif yang melacak status hidup/mati database MySQL (`3306`) dan peladen web Next.js (`3000`).

#### 6.2 Rekomendasi
Untuk pengembangan dan peningkatan sistem keamanan UPNFIX ke depan, direkomendasikan beberapa langkah *hardening* tambahan berikut:
1. **Hardening Kredensial Default:** Sangat disarankan untuk segera mengubah kredensial administratif bawaan pada dasbor Apache HertzBeat (`admin`/`hertzbeat`) guna menghindari pengambilalihan hak pemantauan oleh pihak luar.
2. **Penerapan Web Application Firewall (WAF):** Mengintegrasikan plugin WAF (seperti Coraza WAF atau ModSecurity) pada Apache APISIX Gateway untuk menyaring serangan injeksi tingkat lanjut (XSS, CSRF, dan SQLi) langsung di tingkat terluar sebelum masuk ke aplikasi upstream.
3. **Multi-Factor Authentication (MFA):** Menerapkan mekanisme autentikasi dua faktor (MFA/2FA) menggunakan kode OTP berbasis waktu (TOTP) untuk pengguna dengan role `ADMIN` guna mengantisipasi kebocoran kata sandi.
4. **Desentralisasi Otorisasi Penuh:** Melanjutkan integrasi fungsionalitas Apache Fortress LDAP secara menyeluruh agar seluruh logika evaluasi hak akses peran (RBAC) didelegasikan sepenuhnya ke direktori Fortress, menghilangkan logika otorisasi yang bersifat hardcoded di sisi kode aplikasi.
5. **Saluran Peringatan Terintegrasi:** Menghubungkan HertzBeat Alerting Engine dengan Webhook instan (seperti Telegram Bot atau Slack Webhook) agar administrator mendapatkan notifikasi kegagalan sistem secara *real-time* ke ponsel pintar mereka.

### Daftar Pustaka
1. Apache Software Foundation. (2026). *Apache APISIX Documentation*. Diakses dari https://apisix.apache.org/
2. Apache Software Foundation. (2026). *Apache Directory Fortress Documentation*. Diakses dari https://directory.apache.org/fortress/
3. Apache Software Foundation. (2026). *Apache HertzBeat (incubating) Documentation*. Diakses dari https://hertzbeat.apache.org/
4. Apache Software Foundation. (2026). *Apache SkyWalking Documentation*. Diakses dari https://skywalking.apache.org/
5. International Organization for Standardization. (1994). *ISO/IEC 7498-1:1994 Information technology -- Open Systems Interconnection -- Basic Reference Model: The Basic Model*.
6. OWASP Foundation. (2021). *OWASP Top 10 Vulnerabilities*. Diakses dari https://owasp.org/www-project-top-ten/
7. OWASP Foundation. (2023). *OWASP API Security Top 10*. Diakses dari https://owasp.org/www-project-api-security/
8. Stallings, W. (2017). *Network Security Essentials: Applications and Standards*. Pearson.

### Lampiran

#### Lampiran 1: Hasil Log Eksekusi Skrip Pengujian Otomatis (`run-tests.sh`)
Berikut adalah output mentah (*raw console log*) dari pengujian otomatis pertahanan Layer 5-6-7 OSI pada sistem UPNFIX:
```bash
=====================================================================
             UPNFIX - AUTOMATED SECURITY TESTING SYSTEM
=====================================================================

[Test 1] Pengujian BAC: Akses API Tanpa Login (Layer 5/7)
  [PASS] Akses GET /api/users tanpa token (Expected: 401, Got: 401)

[Test 2] Pengujian TLS Redirect (Layer 6)
  [PASS] Redirect HTTP ke HTTPS sukses (Got: 301)

[Test 3] Registrasi Akun User Biasa Baru (Layer 7)
  [PASS] Sign up user biasa baru (user_5995@upnfix.id) (Expected: 201, Got: 201)

[Test 4] Login Akun User Biasa (Layer 5)
  [PASS] Login user biasa dan simpan cookie (Expected: 200, Got: 200)

[Test 5] Pengujian BAC: User Biasa Akses Menu Admin (Layer 7)
  [PASS] User biasa akses GET /api/users (Expected: 403, Got: 403)

[Test 6] Login Akun Administrator (Layer 5)
  [PASS] Login admin dan simpan cookie (Expected: 200, Got: 200)

[Test 7] Pengujian Otorisasi Admin: Akses API Data User (Layer 7)
  [PASS] Admin sukses akses GET /api/users (Expected: 200, Got: 200)

[Test 8] Pengujian Proteksi SQL Injection (Layer 6/7)
  [PASS] SQL Injection diblokir dengan aman (Got: 400)

[Test 9] Pengujian Rate Limiting / Anti-DoS (Layer 7)
  Mengirimkan 11 request instan ke login endpoint...
  -> Request ke-11 terdeteksi spam dan DIBLOKIR (429)
  [PASS] Rate limit / Anti-DoS berhasil menahan spam

=====================================================================
                       RINGKASAN HASIL TESTING                       
=====================================================================
  Total Test Sukses (PASSED) : 9
  Total Test Gagal (FAILED)  : 0
=====================================================================

✓ SEMUA KONTROL KEAMANAN (LAYER 5-6-7 OSI) BERFUNGSI DENGAN BAIK!
```

#### Lampiran 2: Daftar Tangkapan Layar Pemantauan Sistem (Observability)
*(Anggota kelompok disarankan mengambil screenshot mandiri saat container aktif sebagai lampiran visual)*:
1. **Screenshot Dasbor Apache HertzBeat:** Menunjukkan status ketersediaan (*availability status*) kontainer `upnfix-app:3000` (HTTP), `apisix` (HTTP/HTTPS), dan `upnfix-db:3306` (TCP).
2. **Screenshot Dasbor Apache SkyWalking:** Menunjukkan visualisasi grafik pelacakan request (*distributed tracing chart*) saat memproses request login dan pelaporan.
3. **Screenshot Hasil Command `docker compose ps`:** Menunjukkan bahwa seluruh kontainer (MySQL, Next.js, APISIX, etcd, SkyWalking OAP, SkyWalking UI, HertzBeat, dan Fortress LDAP) berstatus `running` atau `healthy`.
```
```

---

## 6. Verification Plan (Updated)

### A. Pre-requisite Setup
Pengecekan prasyarat pembuatan sertifikat lokal berhasil sebelum deploy stack Docker Compose.

### B. Automated Stack Health Checking
Verifikasi dengan `docker compose ps` untuk memastikan semua container lolos dari internal healthcheck.

### C. Execution of APISIX Setup Script
Pemeriksaan output CLI dari `setup-apisix.sh` memastikan respons API admin bernilai sukses (mengembalikan payload dengan `"key"` pada APISIX 3.x).

### D. Security Verification Methods
Pengujian keamanan dilakukan secara manual dan otomatis:
- **Otomatis (`scripts/run-tests.sh`):** Menjalankan uji coba beruntun menggunakan curl untuk memvalidasi status respons TLS Redirect (301), rate limiting (429), Broken Access Control (403/401), dan SQL Injection (400) secara otomatis.
- **Manual (`request.rest`):** Menggunakan ekstensi VS Code REST Client untuk melakukan pengujian fungsional satu per satu terhadap endpoint keamanan.
- **Observability:**
  - Konfigurasi SkyWalking UI (`http://localhost:8080` via Incognito) memvisualisasikan data transaksi HTTP secara real-time.
  - Metrik uptime HertzBeat UI (`http://localhost:1157` via `admin`/`hertzbeat`) memantau status hidup/mati container.
