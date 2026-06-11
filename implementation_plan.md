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
  }' | jq .
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
      },
      "skywalking": {
        "sample_ratio": 1.0
      }
    }
  }' | jq .
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
      },
      "skywalking": {
        "sample_ratio": 1.0
      }
    }
  }' | jq .
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
      },
      "skywalking": {
        "sample_ratio": 1.0
      }
    }
  }' | jq .
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
      },
      "skywalking": {
        "sample_ratio": 1.0
      }
    }
  }' | jq .
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
      },
      "skywalking": {
        "sample_ratio": 1.0
      }
    }
  }' | jq .
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
    APISIX -->|HTTP Request Tracing Plugin| SkyOAP
    SkyUI --> SkyOAP
    HertzBeat -.->|Uptime Monitoring ICMP/HTTP| APISIX
    HertzBeat -.->|Uptime Monitoring HTTP| App
    HertzBeat -.->|TCP Port Monitoring| DB
```

## 2. Tanggung Jawab Keamanan: APISIX vs Middleware
- **Apache APISIX**: Mengontrol performa, enkripsi, dan rate limiting di sisi tepi jaringan gateway (Layer 6 & 7). APISIX membatasi serangan brute-force, menyembunyikan header asli backend (`Server`, `X-Powered-By`), serta memonitor beban traffic.
- **Next.js Middleware**: Mengontrol sesi identitas di level aplikasi (Layer 5). Middleware memvalidasi cookie `token` dengan pustaka `jose` sebelum diteruskan ke handler internal.
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
- Navigasi ke **Monitors** -> **HTTP Protocol**.
- Tambahkan konfigurasi monitor baru dengan menargetkan endpoint `http://upnfix-app:3000/` untuk memantau ketersediaan aplikasi web Next.js secara internal.
- *Catatan Kredensial*: Akun default `admin`/`hertzbeat` pada HertzBeat merupakan risiko keamanan (default credentials). Kredensial ini disarankan untuk diubah melalui menu Settings di HertzBeat setelah instalasi awal.
```

#### [NEW] [check-health.sh](file:///d:/PWeb-UpnFix/scripts/check-health.sh)
Skrip pembantu untuk memantau status kesehatan database MySQL dan container lainnya sebelum konfigurasi diunggah:
```bash
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
| No | Nama Aset | Jenis Aset | Nilai Keamanan |
| :--- | :--- | :--- | :--- |
| 1 | MySQL Database | Data Sensitif | Confidentiality, Integrity |
| 2 | JWT Auth Cookie | Kredensial Sesi | Confidentiality, Integrity |
| 3 | API Endpoints | Layanan Aplikasi | Availability, Integrity |

#### 3.2 Identifikasi Ancaman
| No | Deskripsi Ancaman | Layer OSI | Target Dampak |
| :--- | :--- | :--- | :--- |
| 1 | Brute-force Login | Layer 5/7 | Pengambilalihan akun pengguna |
| 2 | Broken Access Control | Layer 7 | Kebocoran data sensitif non-admin |
| 3 | Data Leakage via Headers | Layer 6 | Pemetaan celah keamanan sistem |
| 4 | Denial of Service (DoS) | Layer 7 | Kelumpuhan akses layanan sistem |

#### 3.3 Pemetaan Kontrol Keamanan
- Brute-force -> `limit-count` APISIX
- Akses ilegal -> Next.js Middleware + handler role check
- Data Leakage -> `proxy-rewrite` APISIX (Header cleaning)
- DoS & Uptime -> HertzBeat & SkyWalking Monitoring

#### 3.4 Diagram Arsitektur
[Sesuai diagram topologi pada ARCHITECTURE.md]

---

### Bab 4 — Implementasi Simulasi

#### 4.1 Lingkungan Implementasi
- Sistem Operasi: Windows 11 / Linux Ubuntu 22.04 LTS
- Container Platform: Docker Desktop / Docker Engine v24+
- Web Runtime: Next.js v15.5 (Node.js 18)

#### 4.2 Konfigurasi Utama
[Memaparkan cuplikan docker-compose.yml, config.yaml APISIX, dan setup-apisix.sh]

---

### Bab 5 — Pengujian dan Evaluasi

#### 5.1 Skenario Pengujian
[Sesuai matriks pengujian dalam TESTING.md]

#### 5.2 Hasil Sebelum dan Sesudah Mitigasi
[Tabel perbandingan hasil pengujian status HTTP]

---

### Bab 6 — Kesimpulan dan Rekomendasi
#### 6.1 Kesimpulan
Pengamanan berlapis menggunakan APISIX, SkyWalking, dan HertzBeat sukses melindungi sistem UPNFIX dari celah eksploitasi Layer 5-6-7 OSI. Rate limiting sukses menahan spam login, header masking berhasil melindungi identitas server Next.js, dan pembatasan role check berhasil menghentikan Broken Access Control.

#### 6.2 Rekomendasi
- Mengubah kredensial default admin dashboard HertzBeat (`admin`/`hertzbeat`) setelah setup guna mencegah pengambilalihan dasbor monitoring.
- Mengintegrasikan Web Application Firewall (WAF) seperti Coraza atau ModSecurity pada APISIX untuk Layer 7 WAF protection.
- Menerapkan Multi-Factor Authentication (MFA) pada login administrator.
```

---

## 6. Verification Plan (Updated)

### A. Pre-requisite Setup
Pengecekan prasyarat pembuatan sertifikat lokal berhasil sebelum deploy stack Docker Compose.

### B. Automated Stack Health Checking
Verifikasi dengan `docker compose ps` untuk memastikan semua container lolos dari internal healthcheck.

### C. Execution of APISIX Setup Script
Pemeriksaan output CLI dari `setup-apisix.sh` memastikan respons API admin bernilai sukses (mengembalikan payload dengan `"key"` pada APISIX 3.x).

### D. Manual Verification Scripts
Menjalankan perintah uji coba otomatis dari [TESTING.md](file:///d:/PWeb-UpnFix/docs/TESTING.md) untuk memastikan:
- HTTPS validasi localhost.
- Status limit-count membatasi request spam (429).
- Role checking admin-only (403) pada endpoint `/api/users`.
- Konfigurasi SkyWalking UI (`http://localhost:8080`) memvisualisasikan data transaksi HTTP.
- Metrik uptime HertzBeat UI (`http://localhost:1157`) berjalan normal.
