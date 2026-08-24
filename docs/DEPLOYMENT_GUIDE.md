# Dokploy Deployment & Production Operations Guide 🚀

This guide covers deploying, maintaining, and scaling **WAYAPP** on **Dokploy** (host: `paas.usmankhan.xyz`).

---

## 1. Architecture on Dokploy

```mermaid
graph LR
    User[Users / Webhooks] --> Traefik[Dokploy Traefik Reverse Proxy]
    Traefik --> App[WAYAPP Container: GCC (Port 3000)]
    App --> DB[(Postgres 18: wayapp-db)]
    App --> Volume[Persistent Volume: wayapp_gcc_uploads]
    DB --> R2[Dedicated Cloudflare R2: wayapp-backups]
```

---

## 2. Setting Up the Application in Dokploy

1. In Dokploy, open the project **`WAYAPP`** (ID: `KbGneSv2B9bXuW8BxxpKx`).
2. Navigate to your application **`GCC`** (ID: `qiMI5nI31j_vcOZAHyxHB`).
3. Under **General > Git Source**:
   - **Repository:** `usmankhan4001/WAYAPP`
   - **Branch:** `main`
   - **Build Type:** `Docker` (uses root [`Dockerfile`](file:///D:/GCC%20Startup/Whatsapp%20WATI%20clone/Dockerfile))
   - **Auto Deploy:** `Enabled`

---

## 3. Environment Variables Configuration

In Dokploy under the **Environment** tab, set the following environment variables:

```env
# Database Connection (Internal Docker Network)
DATABASE_URL="postgresql://wayapp_user:strong_password@wayapp-db:5432/wayapp?schema=public"

# Application Security
AUTH_SECRET="your_32_byte_random_secret_generated_via_openssl"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Meta WhatsApp Cloud API (Graph API v21.0)
META_API_VERSION="v21.0"
META_PHONE_NUMBER_ID="your_phone_number_id"
META_WABA_ID="your_waba_account_id"
META_API_TOKEN="your_permanent_system_user_token"
META_WEBHOOK_VERIFY_TOKEN="your_webhook_verify_token"
META_APP_SECRET="your_meta_app_secret"

# Dedicated Cloudflare R2 Backup Credentials
S3_BACKUP_ENABLED="true"
S3_ENDPOINT="https://886591346ce7f20bba2a727a409f8045.r2.cloudflarestorage.com"
S3_ACCESS_KEY="34b12172653df075e7567780fd326de9"
S3_SECRET_KEY="your_r2_secret_key"
S3_BUCKET_NAME="wayapp-backups"

# Node Environment
NODE_ENV="production"
PORT=3000
```

---

## 4. Zero-Downtime Health Check Configuration

WAYAPP includes an active health probe endpoint at `/api/health`.

In Dokploy under **Health Checks**:
- **Health Check Type:** `HTTP`
- **Path:** `/api/health`
- **Port:** `3000`
- **Initial Delay:** `15s`
- **Interval:** `10s`
- **Timeout:** `5s`
- **Retries:** `3`

> [!TIP]
> **Why is this critical?**  
> Dokploy will only route incoming traffic to the new container once `/api/health` returns `200 OK`. If the database is starting up or migrations are syncing, the previous container continues serving live users without a single dropped request or error screen.

---

## 5. Persistent Volume Mounts (Media & Uploads)

Under the **Volumes / Mounts** tab in your Dokploy application:
- **Volume Name:** `wayapp_gcc_uploads`
- **Mount Path:** `/app/uploads`
- **Type:** `Volume`

This ensures that uploaded photos, voice notes, PDFs, and customer attachments persist safely across container rebuilds and rolling updates.

---

## 6. Automated Cloudflare R2 Backups (No CMS Mixing)

In Dokploy under **Databases > `wayapp-db` > Backups**:

1. **Backup Destination:** Select **`WAYAPP Dedicated Backup`** (`jOrSRHq_5B19N01gXcIh1`)
   - **Provider:** Cloudflare R2
   - **Bucket:** `wayapp-backups`
   - **Endpoint:** `https://886591346ce7f20bba2a727a409f8045.r2.cloudflarestorage.com`
2. **Cron Schedule:** `0 */12 * * *` (Every 12 hours / twice daily)
3. **Database Name:** `wayapp`
4. **Prefix:** `wayapp`

> [!CAUTION]
> **Strict Isolation Directive:**  
> NEVER point WAYAPP backups to `gccstarup-cms` or shared buckets. WAYAPP database snapshots must remain strictly inside `wayapp-backups`.

---

## 7. Manual Deploy & Rollback Commands

### Triggering Manual Deploy via CLI / API:
```bash
curl -X POST "https://paas.usmankhan.xyz/api/trpc/application.deploy" \
  -H "x-api-key: your_dokploy_api_key" \
  -H "Content-Type: application/json" \
  -d '{"json":{"applicationId":"qiMI5nI31j_vcOZAHyxHB"}}'
```

### Checking Deployment Status:
```bash
curl "https://paas.usmankhan.xyz/api/trpc/deployment.all?input=%7B%22json%22%3A%7B%22applicationId%22%3A%22qiMI5nI31j_vcOZAHyxHB%22%7D%7D" \
  -H "x-api-key: your_dokploy_api_key"
```
