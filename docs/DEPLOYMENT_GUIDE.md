# Deployment Guide (Dokploy)

This guide covers deploying WAYAPP on **Dokploy** (host: `paas.usmankhan.xyz`).

## Prerequisites
- A connected Dokploy server.
- A PostgreSQL database (can be hosted on Dokploy or external).
- An S3-compatible storage bucket (e.g., Cloudflare R2) for backups.

## 1. Create a New Application
1. In Dokploy, go to **Applications** -> **Create Application**.
2. Connect your GitHub repository (`usmankhan4001/WAYAPP`).
3. Set the build type to **Docker** (using the provided `Dockerfile`).

## 2. Set Environment Variables
Go to the **Environment** tab in your Dokploy app and add the required variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/wayapp
AUTH_SECRET=your_super_secret_random_string
NEXT_PUBLIC_APP_URL=https://your-wayapp-domain.com
META_API_VERSION=v21.0
```
*Note:* `AUTH_SECRET` is required for securing user sessions.

## 3. Zero-Downtime Health Checks
WAYAPP includes a built-in health check route at `/api/health`.
In Dokploy, configure the health check:
- **Path**: `/api/health`
- **Port**: `3000`

*Why?* Dokploy will wait for this route to return a `200 OK` before routing live traffic to the new container. This ensures **zero downtime** when you deploy updates. The old version keeps running until the new one is fully ready.

## 4. R2 Backups
WAYAPP supports automated database backups to S3/R2 storage.
Set these environment variables to enable it:
```env
S3_BACKUP_ENABLED=true
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=your_r2_access_key
S3_SECRET_KEY=your_r2_secret_key
S3_BUCKET_NAME=wayapp-backups
```
A cron job within the WAYAPP worker container will automatically zip and push your database backups to R2 daily.
