# Cloudflare Setup Guide for SarkariExams.me

## Prerequisites
- Your domain: `sarkariexams.me`
- Cloudflare account (free tier works)

---

## Step 1: Add Domain to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter `sarkariexams.me`
4. Select the Free plan
5. Cloudflare will scan your DNS records

---

## Step 2: Update Nameservers

Cloudflare will give you two nameservers like:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

Go to your domain registrar and update the nameservers.
Wait 24-48 hours for propagation.

---

## Step 3: Configure DNS Records

Ensure your records have the **orange cloud** (Proxied) enabled:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | Your Digital Ocean Droplet IP | ✅ Proxied |
| CNAME | www | sarkariexams.me | ✅ Proxied |

---

## Step 4: Enable Security Features

### 4.1 SSL/TLS
- Go to **SSL/TLS** → Overview
- Set encryption mode to **Full (strict)**

### 4.2 Bot Fight Mode
- Go to **Security** → Bots
- Enable **Bot Fight Mode** (free)

### 4.3 Rate Limiting (Recommended)
- Go to **Security** → WAF → Rate limiting rules
- Create rule:
  - Name: `API Rate Limit`
  - When: URI Path contains `/api/`
  - Requests: 100 per minute per IP
  - Action: Challenge

### 4.4 Firewall Rules
- Go to **Security** → WAF → Custom rules
- Block TOR: `(cf.is_tor)` → Block
- Block bad bots: `(cf.bot_score lt 30)` → Challenge

---

## Step 5: Caching (Performance)

- Go to **Caching** → Configuration
- Browser Cache TTL: 4 hours
- Enable "Always Online"

---

## Verification

After setup, you should see:
- `CF-RAY` header in responses
- `CF-Connecting-IP` in your backend logs
- Cloudflare challenge pages for suspicious traffic

---

## Backend Integration (Already Done)

The backend code has been updated to:
1. Extract real IP from `CF-Connecting-IP` header
2. Use real IP for rate limiting
3. Log Cloudflare country code

Files modified:
- `backend/src/middleware/cloudflare.ts` (new)
- `backend/src/server.ts` (imports middleware)
- `backend/src/middleware/rateLimit.ts` (uses getRealIp)
