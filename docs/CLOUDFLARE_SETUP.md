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
  - Requests: 60 per minute per IP
  - Action: Challenge

- Create rule:
  - Name: `Auth Burst Limit`
  - When: URI Path starts with `/api/auth/`
  - Requests: 20 per minute per IP
  - Action: Managed Challenge

- Create rule:
  - Name: `CSRF Endpoint Limit`
  - When: URI Path equals `/api/auth/csrf`
  - Requests: 30 per minute per IP
  - Action: Block for 1 minute

### 4.4 Firewall Rules
- Go to **Security** → WAF → Custom rules
- Block TOR: `(cf.is_tor)` → Block
- Block bad bots: `(cf.bot_score lt 30)` → Challenge

- Add API scraping resistance:
  - Expression: `(starts_with(http.request.uri.path, "/api/") and cf.bot_score lt 45)`
  - Action: Managed Challenge

- Add docs reconnaissance resistance:
  - Expression: `(http.request.uri.path contains "/api/docs" and ip.geoip.country ne "IN")`
  - Action: Block

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

### 72-Hour Verification Checklist

Track these before/after metrics for 72 hours after rollout:

| Metric | Expected Trend |
|------|------|
| Security Events/day | Downward trend after first 24h spike |
| Bot score on `/api/*` | Median score increases |
| `429` responses from API | Initial rise, then stable lower baseline |
| `403`/challenge on suspected scrapers | Increase without user complaint spike |
| Top attacked paths | Fewer `/api/docs`, high-offset listing queries |

If false positives rise:
1. Lower strictness for generic API by moving bot threshold from 45 to 35.
2. Keep strict rules on `/api/auth/*` and `/api/admin/*`.
3. Add allowlist entries for office/VPN egress IPs.

---

## Backend Integration (Already Done)

The backend code has been updated to:
1. Extract real IP from `CF-Connecting-IP` header
2. Use real IP for rate limiting
3. Log Cloudflare country code
4. Restrict public listing/search page size defaults
5. Rate-limit `/api/auth/csrf`
6. Tighten brute-force policy for login attempts

The nginx proxy has been updated to:
1. Enforce API request body/timeouts for abuse resistance
2. Add anti-index headers on `/api/*`
3. Limit websocket connections per IP
4. Forward request IDs to backend for edge-to-app traceability

Files modified:
- `backend/src/middleware/cloudflare.ts` (new)
- `backend/src/server.ts` (imports middleware)
- `backend/src/middleware/rateLimit.ts` (uses getRealIp)
