# Deployment Guide — Super ERP

## Deployment Options

| Method | Description | Recommended |
|--------|-------------|-------------|
| PM2 + Node | Single VPS/server | ✅ Current best fit |
| Docker | Containerized | ✅ For isolation |
| Vercel | Serverless (no SQLite) | ❌ Incompatible (SQLite) |

---

## Production Deployment (PM2)

### 1. Server Requirements
- Linux VPS (Ubuntu 22.04+ recommended)
- Node.js 20.x LTS
- 2GB RAM minimum
- 10GB disk space

### 2. Setup

```bash
# Install PM2 globally
npm install -g pm2

# Clone and install on server
git clone <repo-url> /var/www/super-erp
cd /var/www/super-erp
npm ci --production

# Configure environment
cp .env.example .env
# Fill in production values (strong JWT_SECRET, DATABASE_PATH, etc.)

# Build the Next.js app
npm run build

# Start with PM2
pm2 start npm --name "super-erp" -- start
pm2 save
pm2 startup  # Enable auto-restart on server reboot
```

### 3. Environment Variables (Production)

```env
NODE_ENV=production
JWT_SECRET=<64+ character random string>
DATABASE_PATH=/var/data/erp.db
RATE_LIMIT_MAX=500
CORS_ALLOWED_ORIGINS=https://yourdomain.com
TELEGRAM_BOT_TOKEN=<your-token>
TELEGRAM_CHAT_ID=<your-chat-id>
```

---

## Docker Deployment

```bash
# Build the image
docker build -t super-erp .

# Run with persistent database volume
docker run -d \
  --name super-erp \
  -p 3000:3000 \
  -v /var/data/erp:/app/data \
  --env-file .env.production \
  super-erp
```

---

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database Backup

```bash
# Manual backup
cp /var/data/erp.db /var/backups/erp-$(date +%Y%m%d).db

# Automated daily backup (cron)
0 2 * * * cp /var/data/erp.db /var/backups/erp-$(date +\%Y\%m\%d).db
```

---

## Health Check

```bash
# Check if the app is running
curl http://localhost:3000/api/health

# View PM2 logs
pm2 logs super-erp

# View application logs
tail -f logs/access.log
tail -f logs/error.log
```

---

## Updating Production

```bash
cd /var/www/super-erp
git pull origin main
npm ci --production
npm run build
pm2 restart super-erp
```
