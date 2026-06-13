### 3.5 Diagram Arsitektur Jaringan (Deployment)

Dokumen ini memvisualisasikan diagram arsitektur deployment sistem UPNFIX yang terisolasi di dalam jaringan virtual kontainer Docker (`upnfix-net`) menggunakan tumpukan teknologi keamanan Apache Software Foundation.

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

### Penjelasan Komponen Arsitektur:
1. **Host Exposed Ports (Interface Publik):**
   * Pintu masuk utama lalu lintas data bagi pengguna. Lalu lintas HTTP (Port 80) dialihkan ke HTTPS (Port 443) demi keamanan data.
   * Port `1157` dan `8080` diekspos ke host agar Administrator sistem dapat memantau status monitoring (HertzBeat) dan grafik distributed tracing (SkyWalking).
2. **Gateway Tier (Apache APISIX):**
   * Berfungsi sebagai *reverse proxy* di tepi jaringan (*edge*). APISIX melakukan enkripsi/dekripsi HTTPS (*TLS Termination*) dan menerapkan pembatasan laju (*Rate Limiting*) sebelum request menyentuh Next.js.
3. **Application Tier (Next.js):**
   * Menjalankan logika bisnis aplikasi dan memvalidasi cookie sesi JWT (Layer 5 Session).
4. **Data & Identity Tier:**
   * MySQL menyimpan data relasional dummy secara aman.
   * Apache Fortress LDAP memusatkan hak akses (*decoupled authorization*).
5. **Observability & Monitoring Tier:**
   * HertzBeat secara berkala mengirimkan probe sintetik untuk memastikan ketersediaan server.
   * SkyWalking menerima data trace dari *APISIX telemetry plugin* guna mendeteksi anomali jaringan.
