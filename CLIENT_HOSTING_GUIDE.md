# Academy Owner Server Hosting & Cloudflare Tunnel Guide

This guide enables the owner of **Shree Science Academy** to run the backend server directly on their personal machine (PC or laptop), saving 100% of cloud hosting costs while serving students reliably through HTTPS.

---

## 1. How It Works

```
[ Students on Mobile / Laptops ]
             │
             ▼ HTTPS
[ Vercel Frontend (Free) ]
             │
             ▼ HTTPS (api.yourdomain.com OR xyz.trycloudflare.com)
[ Cloudflare Tunnel (Free & Secure) ]
             │ (Encrypted Pipe through Router/NAT)
             ▼
[ Academy Owner's Laptop / PC: Port 5000 ]
             │
             ▼ PostgreSQL connection
[ Supabase Cloud Database (Free) ]
```

- **Zero Cloud Costs:** No Render, AWS, or DigitalOcean server bills.
- **High Hardware Performance:** Modern home/office laptops (8-16 GB RAM) outmatch free/low-tier cloud servers with no RAM limits or cold-start sleep delays.
- **Zero Router Port Forwarding:** Cloudflare Tunnel creates an outbound encrypted tunnel to Cloudflare edge network, bypassing ISP CGNAT and dynamic IPs automatically.

---

## 2. Quick Start: Running on Owner's Machine

### Method A: 1-Click Launch (Easiest)
1. Double-click **`START_ACADEMY_SERVER.bat`** in the project root directory.
2. The launcher will automatically:
   - Check Node.js and dependencies
   - Verify connection with Supabase PostgreSQL
   - Start the HTTP & WebSocket server on `http://localhost:5000`

---

## 3. Exposing to Students (Via Free Cloudflare Tunnel)

To allow students anywhere (home or classroom) to connect securely via HTTPS to the local backend:

### Step 1: Install `cloudflared` (One-Time)
- Download the Windows 64-bit executable from Cloudflare:
  [https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe)
- Rename it to `cloudflared.exe` and place it in your Windows directory or project root.

### Step 2: Start Quick Free Tunnel (Zero Setup)
Open Command Prompt and run:
```cmd
cloudflared tunnel --url http://localhost:5000
```
Cloudflare will immediately output a temporary free HTTPS URL such as:
```
https://xyz-random-subdomain.trycloudflare.com
```

### Step 3: Connect Frontend to Tunnel
In Vercel (or `frontend/.env`), set:
```
VITE_API_URL=https://xyz-random-subdomain.trycloudflare.com/api
```
*(Or if you connect a free domain name in Cloudflare Zero Trust dashboard, you get a permanent custom URL like `https://api.shreescienceacademy.com/api` that never changes).*

---

## 4. Best Practices for Exam Days

1. **Disable Sleep Mode:**
   - On the owner's laptop: Go to Windows Settings $\rightarrow$ System $\rightarrow$ Power & Sleep $\rightarrow$ Set **"When plugged in, turn off after"** to **Never**.
2. **Keep Laptop Plugged In:**
   - Keep AC power adapter connected during exam hours.
3. **Bandwidth:**
   - Questions and sessions are cached in memory (LRU Cache). The load on local internet is tiny (just small JSON payloads and WebSocket heartbeats).
