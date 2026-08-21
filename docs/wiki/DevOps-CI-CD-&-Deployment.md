# 🐳 DevOps, CI/CD Pipelines & Deployment Guide

WAYAPP Enterprise can be deployed on bare metal, single Docker containers, Docker Compose, or Kubernetes clusters.

---

## 🚀 1. Production Docker Compose Deployment

A complete `docker-compose.yml` is provided at the repository root with PostgreSQL, Redis, and automated migrations.

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/usmankhan4001/wayapp:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://wayapp_user:wayapp_password@db:5432/wayapp_db?schema=public
      - REDIS_URL=redis://redis:6379
      - AUTH_SECRET=your_production_auth_secret_minimum_32_chars
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=wayapp_user
      - POSTGRES_PASSWORD=wayapp_password
      - POSTGRES_DB=wayapp_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Launching the Stack:
```bash
docker compose up -d
```

---

## 🔄 2. GitHub CI/CD Workflows

The repository includes pre-configured GitHub Actions workflows in `.github/workflows/`:

1. **`ci.yml` (Quality Assurance & Matrix Tests)**:
   * Runs on every push and pull request.
   * Tests across **Node.js 20.x** and **Node.js 22.x**.
   * Executes Prisma generation, `npx tsc --noEmit` typechecks, and 35+ Vitest tests with code coverage.
2. **`docker-publish.yml` (Container Release)**:
   * Builds multi-architecture Docker images (`linux/amd64`, `linux/arm64`).
   * Publishes images directly to GitHub Container Registry (`ghcr.io/usmankhan4001/wayapp`).
3. **`security-scan.yml` (CodeQL Analysis)**:
   * Analyzes JavaScript/TypeScript code for security vulnerabilities.
4. **`dependabot.yml`**:
   * Automated weekly dependency updates for npm packages and GitHub Actions.
