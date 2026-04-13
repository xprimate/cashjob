# CashJob Deployment Guide

## 1. Overview
This guide covers deploying CashJob to a production VPS (e.g., `cashjob.ca`) with Node.js backend and static React frontend served by Nginx.

## 2. Server preparation
1. SSH into server:
   - `ssh user@vps-ip`
2. Update and install packages:
   - `sudo apt update && sudo apt upgrade -y`
   - `sudo apt install -y git curl nginx build-essential`
3. Install Node.js (LTS):
   - `curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
   - `sudo apt install -y nodejs`
   - `node -v && npm -v`
4. Install process manager:
   - `sudo npm install -g pm2`
   - `pm2 startup`
   - `pm2 save`

## 3. Clone repository
```bash
cd /var/www
git clone <your-repo-url> cashjob
cd cashjob
```

## 4. Install and build
### Backend
```bash
cd /var/www/cashjob/server
npm install
```

### Frontend
```bash
cd /var/www/cashjob/client
npm install
npm run build
```

## 5. Backend production start
Ensure `server/package.json` has a start script:
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```
Start with pm2:
```bash
cd /var/www/cashjob/server
export NODE_ENV=production
export PORT=4000
export JWT_SECRET="yourstrongjwtsecret"
pm run install
pm2 start npm --name cashjob-backend -- run start
pm2 save
```

## 6. Nginx reverse proxy (frontend + backend)
Create `/etc/nginx/sites-available/cashjob`:
```nginx
server {
  listen 80;
  server_name cashjob.ca www.cashjob.ca;

  root /var/www/cashjob/client/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/cashjob /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS setup
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cashjob.ca -d www.cashjob.ca
sudo certbot renew --dry-run
```

## 8. Environment variables
Backend .env (or export):
- `NODE_ENV=production`
- `PORT=4000`
- `JWT_SECRET=...`
- `DB_PATH=/var/www/cashjob/server/data.db` (if used)
- SMTP settings if email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## 9. Optional: Git updates and redeploy
```bash
cd /var/www/cashjob
git pull origin main
cd server && npm install
cd ../client && npm run build
pm2 restart cashjob-backend
sudo systemctl reload nginx
```

## 10. Basic testing
- Frontend: `https://cashjob.ca`
- API: `https://cashjob.ca/api/jobs`
- Admin: login + verify user list and job actions
- Logs: `pm2 logs cashjob-backend`

## 11. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp, 4000/tcp,
sudo ufw enable
```

## 12. Production sanity checks
- Ensure no `npm run dev` usage in production.
- Use `pm2 status` to monitor.
- Ensure `compress` and `caching` at nginx if needed.

## 13. Continuous deployment (optional)
- Configure GitHub Actions pipeline (see `ARCHITECTURE.md`).
- Use secrets for prod values and deployment SSH keys.
- Use a script to SSH + pull + build on prod server for CI deployment.


## useful commands
 #firewal: sudo ufw allow 4000/tcp
sudo ufw reload