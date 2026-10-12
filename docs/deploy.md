# คู่มือ deploy — HTC Insights v2

ระบบนี้รันบน **เซิร์ฟเวอร์ Linux เครื่องเดียวที่มีดิสก์ถาวร** (ไม่ใช่ Vercel) เพราะฐานข้อมูลเป็นไฟล์ SQLite
และรูปที่อัปโหลดเก็บบนดิสก์ โครงสร้าง:

```
อินเทอร์เน็ต → nginx (HTTPS, rate limit, เพดานขนาด body) → next start :3000 (systemd)
                                                              ├─ /var/lib/htc-insights/htc.db
                                                              └─ /var/lib/htc-insights/uploads/
```

ตัวอย่างทั้งหมดใช้โดเมน `insights.example.ac.th` ผู้ใช้ระบบ `htc` และโค้ดที่ `/opt/htc-insights`
เปลี่ยนเป็นค่าจริงของคุณ

## 1. เตรียมเครื่อง (ครั้งเดียว)

- Node.js 20.9 ขึ้นไป (แนะนำ 22 LTS) · nginx · certbot · sqlite3 (ใช้สำรองข้อมูล) · git
- ผู้ใช้ระบบสำหรับรันแอป และโฟลเดอร์ข้อมูลที่อยู่ **นอก** โฟลเดอร์โค้ด

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin htc
sudo mkdir -p /var/lib/htc-insights/uploads /var/backups/htc-insights
sudo chown -R htc:htc /var/lib/htc-insights /var/backups/htc-insights
sudo git clone https://github.com/devf51/HTC-Insights.git /opt/htc-insights
sudo chown -R htc:htc /opt/htc-insights
```

## 2. Google OAuth

Google Cloud Console → APIs & Services → Credentials → OAuth client (Web application)
เพิ่ม Authorized redirect URI:

```
https://insights.example.ac.th/api/auth/callback/google
```

## 3. ไฟล์ `.env` ของเครื่องจริง

สร้าง `/opt/htc-insights/.env` (ห้ามเข้า git — `.gitignore` กันไว้แล้ว) สิทธิ์ `600` เจ้าของ `htc`

```bash
DATABASE_URL="file:/var/lib/htc-insights/htc.db"
UPLOAD_DIR="/var/lib/htc-insights/uploads"

# สร้างใหม่ ห้ามใช้ค่าเดียวกับเครื่อง dev:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_URL="https://insights.example.ac.th"
AUTH_TRUST_HOST=true

ALLOWED_STUDENT_DOMAIN="..."   # โดเมนอีเมลของนักศึกษา
SUPER_ADMIN_EMAIL="..."        # ต้องตั้งก่อนคนนี้ล็อกอินครั้งแรก

SERPAPI_KEY=""                 # ไม่บังคับ — ว่าง = นักศึกษาปักหมุดบริษัทเอง
```

## 4. ติดตั้ง build และสร้างฐานข้อมูล

รันเป็นผู้ใช้ `htc` ใน `/opt/htc-insights`:

```bash
npm ci
npx prisma migrate deploy      # สร้าง/อัปเดตตารางใน htc.db
npx prisma generate            # client อยู่ใน app/generated ซึ่งไม่เข้า git
npm run build
```

ห้ามรัน `npx prisma db seed` บนเครื่องจริง (seed ปฏิเสธเองถ้า `DATABASE_URL` ไม่ใช่ไฟล์ dev)

## 5. รันด้วย systemd

`/etc/systemd/system/htc-insights.service`

```ini
[Unit]
Description=HTC Insights
After=network.target

[Service]
User=htc
WorkingDirectory=/opt/htc-insights
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now htc-insights
journalctl -u htc-insights -f   # ดู log
```

`HOSTNAME=127.0.0.1` ให้แอปรับเฉพาะจาก nginx บนเครื่องเดียวกัน ไม่เปิดพอร์ต 3000 สู่ภายนอก

## 6. nginx — HTTPS, rate limit, เพดานขนาด body

แอปไม่มี rate limit ในตัว — จำกัดที่ nginx ตามคำแนะนำของ Next.js สำหรับ self-hosting

`/etc/nginx/conf.d/htc-insights.conf`

```nginx
# rate limit ต่อ IP — /api/ (เขียนข้อมูล อัปโหลด กดถูกใจ รายงาน) เข้มกว่าหน้าเว็บทั่วไป
limit_req_zone $binary_remote_addr zone=htc_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=htc_auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=htc_pages:10m rate=30r/s;
limit_req_status 429;

server {
    listen 80;
    server_name insights.example.ac.th;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name insights.example.ac.th;
    # ใบรับรองจาก: sudo certbot --nginx -d insights.example.ac.th

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # รีวิวแนบรูปได้ 2 รูป รูปละไม่เกิน 5 MB (lib/review-rules.ts) + ช่องข้อความ
    client_max_body_size 12m;

    location /api/auth/signin {
        limit_req zone=htc_auth burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/htc-proxy.conf;
    }

    location /api/ {
        limit_req zone=htc_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/htc-proxy.conf;
    }

    location / {
        limit_req zone=htc_pages burst=60 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/htc-proxy.conf;
    }
}
```

`/etc/nginx/htc-proxy.conf`

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
# App Router ส่งหน้าแบบ streaming — ปิด buffer ไม่งั้นหน้าค้างจนโหลดครบ
proxy_buffering off;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d insights.example.ac.th
```

ห้ามใส่ `form-action` ใน CSP ที่ nginx — ปุ่มเข้าสู่ระบบ Google จะพัง (security headers อื่นตั้งไว้ใน `next.config.ts` แล้ว)

## 7. ผู้ดูแลระดับสูงคนแรก

ให้เจ้าของอีเมล `SUPER_ADMIN_EMAIL` เข้าสู่ระบบด้วย Google หนึ่งครั้ง จะได้บทบาทผู้ดูแลระดับสูงอัตโนมัติ
แล้วแต่งตั้งผู้ดูแลคนอื่นที่ `/admin/users`

## 8. สำรองข้อมูล — ฐานข้อมูลกับรูปต้องไปด้วยกันเสมอ

`/etc/cron.d/htc-insights-backup` (ทุกวันตี 2 เก็บ 14 วัน)

```cron
0 2 * * * htc sqlite3 /var/lib/htc-insights/htc.db ".backup /var/backups/htc-insights/htc-$(date +\%F).db" && tar -czf /var/backups/htc-insights/uploads-$(date +\%F).tar.gz -C /var/lib/htc-insights uploads && find /var/backups/htc-insights -mtime +14 -delete
```

ใช้ `.backup` ของ sqlite3 ไม่ใช่ `cp` — คัดลอกไฟล์ตอนแอปกำลังเขียนได้ไฟล์เสีย
คัดลอกโฟลเดอร์ `/var/backups/htc-insights` ออกนอกเครื่องด้วย (ดิสก์เสีย = หายทั้งคู่)

**กู้คืน:** หยุดแอป → คัดลอกไฟล์ `.db` ที่สำรองไว้ทับ `htc.db` → แตก `uploads-*.tar.gz` ทับ `uploads/` ของวันเดียวกัน → เริ่มแอป

## 9. อัปเดตเวอร์ชัน

```bash
sudo systemctl stop htc-insights
cd /opt/htc-insights && git pull
npm ci && npx prisma migrate deploy && npx prisma generate && npm run build
sudo systemctl start htc-insights
```

สำรองข้อมูลก่อน `migrate deploy` ทุกครั้ง

## 10. ตรวจหลัง deploy

- เปิด `https://insights.example.ac.th` ได้ และ `http://` พาไป `https://`
- เข้าสู่ระบบด้วย Google ได้ บัญชีโดเมนนักศึกษาได้บทบาทนักศึกษา
- เขียนรีวิวแนบรูป 2 รูปได้ (ถ้าได้ 413 = `client_max_body_size` ไม่ถูกใช้)
- ผู้ดูแลเปิดรูปบัตรนักศึกษาในแท็บคำขอยืนยันสิทธิ์ได้ ส่วนเปิดลิงก์เดียวกันตอนไม่ล็อกอินต้องได้ 401
- super admin ส่งออกรายงาน PDF ที่ `/admin/dashboard/report` แล้วเปิดดูด้วยตาว่าภาษาไทยครบ
- `ls /var/backups/htc-insights` มีไฟล์สำรองของคืนแรก
