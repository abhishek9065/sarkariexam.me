# DigitalOcean Deployment Guide

## Prerequisites
- DigitalOcean account
- Domain pointed to Cloudflare (from previous setup)
- SSH key configured

---

## Step 1: Create SSH Key (On Your Local Machine)

Before creating a Droplet, you need an SSH key for secure access.

### Generate SSH Key (if you don't have one):
```bash
# Run on your local machine (Linux/Mac)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter to accept default location (~/.ssh/id_ed25519)
# Enter a passphrase (optional but recommended)
```

### View your public key:
```bash
cat ~/.ssh/id_ed25519.pub
# Copy the entire output
```

---

## Step 2: Add SSH Key to DigitalOcean

1. Go to [DigitalOcean Settings → Security](https://cloud.digitalocean.com/account/security)
2. Click **"Add SSH Key"**
3. Paste your public key (from step above)
4. Give it a name (e.g., "My Laptop")
5. Click **"Add SSH Key"**

---

## Step 3: Create Droplet

1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **Create → Droplets**
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $6/mo (1GB RAM) or $12/mo (2GB RAM recommended)
   - **Datacenter**: Singapore (for India users)
   - **Authentication**: Select your SSH Key from the list

4. Click **"Create Droplet"**

---

## Step 4: Find Your Droplet IP Address

After creation:
1. Go to [Droplets Dashboard](https://cloud.digitalocean.com/droplets)
2. Your IP is shown in the **ipv4** column
3. Example: `143.198.123.45`

You can also click on the Droplet name to see full details.

---

## Step 5: Initial Server Setup

### 5.1: Connect to Your Server via SSH

Open your **local terminal** (on your laptop/PC, NOT DigitalOcean):

```bash
# Replace with your actual Droplet IP
ssh root@143.198.123.45
```

**What happens:**
- First time: You'll see "Are you sure you want to continue connecting?" → Type **yes** and press Enter
- If you set a passphrase for your SSH key, enter it now
- You're now connected when you see: `root@your-droplet-name:~#`

---

### 5.2: Update System Packages

Run these commands **inside the server** (after SSH):

```bash
# Update package list
apt update

# Upgrade all packages (may take 2-3 minutes)
apt upgrade -y
```

---

### 5.3: Install Docker

```bash
# This downloads and installs Docker automatically
curl -fsSL https://get.docker.com | sh
```

Verify Docker is installed:
```bash
docker --version
# Should show: Docker version 24.x.x
```

---

### 5.4: Install Docker Compose Plugin

```bash
apt install docker-compose-plugin -y
```

Verify:
```bash
docker compose version
# Should show: Docker Compose version v2.x.x
```

---

### 5.5: Create a Non-Root User (Recommended for Security)

```bash
# Create user named "deploy"
adduser deploy
# Enter a password when prompted
# Press Enter to skip other questions

# Give deploy user permission to use Docker
usermod -aG docker deploy
```

---

### 5.6: Verify Everything Works

```bash
# Test Docker
docker run hello-world

# You should see "Hello from Docker!" message
```

**You're now ready to deploy the application!**

---

## Step 6: Deploy Application

### 6.1: Switch to Deploy User

```bash
# Switch from root to deploy user
su - deploy

# You should see: deploy@your-droplet:~$
```

---

### 6.2: Clone Your Repository

```bash
# Clone the project
git clone https://github.com/abhishek9065/sarkari-result.git

# Enter the project folder
cd sarkari-result

# Verify files are there
ls -la
# You should see: docker-compose.yml, backend/, frontend/, nginx/, etc.
```

---

### 6.3: Create Environment File

```bash
# Copy the example env file
cp .env.example .env

# Edit the environment file
nano .env
```

---

### 6.3.1: Configure DATABASE_URL (PostgreSQL Database)

**Format:**
```
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

**Option A: Use Neon.tech (FREE - Recommended)**

1. Go to [neon.tech](https://neon.tech) and create free account
2. Click "Create Project" 
3. Name it: `sarkari-db`
4. Click "Connection string" → Copy it
5. It looks like:
```
postgresql://abhishek:abcd1234@ep-cool-sun-123456.us-east-2.aws.neon.tech/sarkari_db
```

**Option B: Use Supabase (FREE)**
1. Go to [supabase.com](https://supabase.com)
2. Create project → Go to Settings → Database → Connection string

---

### 6.3.2: Generate JWT_SECRET (Security Key)

Run this command on your server to generate a secure key:
```bash
openssl rand -base64 32
```

**Example output:**
```
K8xPqR2mN5vB7yC1dF4gH6jL9pS3wE0tU8iO2aZ5nM=
```

Copy this output - this is your JWT_SECRET.

---

### 6.3.3: Edit the .env File in Nano

After running `nano .env`, you'll see a file like this:
```
DATABASE_URL=postgresql://user:password@your-db-host:5432/sarkari_db
JWT_SECRET=your-super-secret-jwt-key
```

**How to edit:**
1. Use **arrow keys** (↑↓←→) to move cursor
2. Use **Backspace** to delete
3. Type your actual values

**Example with real values:**
```
DATABASE_URL=postgresql://abhishek:mypass123@ep-cool-sun-123456.us-east-2.aws.neon.tech/sarkari_db
JWT_SECRET=K8xPqR2mN5vB7yC1dF4gH6jL9pS3wE0tU8iO2aZ5nM=
```

---

### 6.3.4: Save and Exit Nano

1. Press `Ctrl + X` (hold Ctrl, press X)
2. You'll see "Save modified buffer?" → Press `Y`
3. You'll see filename → Press `Enter`

**Done!** Your environment is configured.

---

### 6.4: Build and Start Containers

```bash
# Build and start production services (takes 3-5 minutes first time)
docker compose up -d --build nginx backend frontend admin-frontend
```

**What this does:**
- Builds the backend Docker image
- Builds the frontend Docker image
- Starts nginx, backend, and frontend containers
- `-d` runs them in background (detached mode)

---

### 6.5: Verify Deployment

```bash
# Check if all containers are running
docker compose ps
```

**Expected output:**
```
NAME                STATUS              PORTS
sarkari-backend     Up 2 minutes       4000/tcp
sarkari-frontend    Up 2 minutes       80/tcp
sarkari-nginx       Up 2 minutes       0.0.0.0:80->80/tcp
```

All should show "Up" status.

---

### 6.6: View Logs (if something goes wrong)

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View specific service logs
docker compose logs backend
docker compose logs frontend
```

Press `Ctrl + C` to stop following logs.

---

### 6.7: Test Your Site

Open your browser and visit:
```
http://YOUR_DROPLET_IP
```

You should see your SarkariExams website! 🎉

---

## Step 7: Configure Firewall

The firewall protects your server by blocking unwanted traffic.

### 7.1: Switch back to root (if you're still as deploy user)
```bash
exit
# Now you should see: root@your-droplet:~#
```

### 7.2: Allow required ports
```bash
# Allow SSH (so you don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP (web traffic)
sudo ufw allow 80/tcp

# Allow HTTPS (secure web traffic)
sudo ufw allow 443/tcp
```

### 7.3: Enable the firewall
```bash
sudo ufw enable
```

You'll see: "Command may disrupt existing ssh connections. Proceed with operation (y|n)?"
Type **y** and press Enter.

### 7.4: Verify firewall status
```bash
sudo ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## Step 8: Update Cloudflare DNS

Now point your domain to your new server.

### 8.1: Get Your Droplet IP
```bash
# On your server, run:
curl ifconfig.me
# This shows your public IP
```

### 8.2: Update DNS in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain: `sarkariexams.me`
3. Click **DNS** in the sidebar
4. Find your **A record** (or create one):
   - **Type**: A
   - **Name**: `@` (or `sarkariexams.me`)
   - **IPv4 address**: `YOUR_DROPLET_IP`
   - **Proxy status**: ✅ Proxied (orange cloud)
   - **TTL**: Auto

5. Also update/create **www** record:
   - **Type**: CNAME
   - **Name**: `www`
   - **Target**: `sarkariexams.me`
   - **Proxy status**: ✅ Proxied

6. Click **Save**

### 8.3: Wait for DNS Propagation

DNS changes can take 5-30 minutes to propagate.

### 8.4: Test Your Domain

Open your browser and visit:
```
https://sarkariexams.me
```

🎉 **Congratulations! Your site is now live on DigitalOcean!**

---

## Maintenance Commands

### View logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

### Restart services
```bash
docker compose restart
```

### Update application
```bash
git pull --ff-only origin main
docker compose up -d --build nginx backend frontend admin-frontend
# Recommended guarded path:
# bash scripts/deploy-prod.sh
```

### View resource usage
```bash
docker stats
```

---

## Troubleshooting

### Check if containers are running
```bash
docker compose ps
```

### Check container health
```bash
docker inspect --format='{{.State.Health.Status}}' sarkari-backend
```

### View nginx access logs
```bash
docker compose exec nginx tail -f /var/log/nginx/access.log
```

---

## Cost Estimate

| Resource | Cost/Month |
|----------|------------|
| Droplet (2GB) | $12 |
| Database (managed) | $15 |
| **Total** | **~$27/month** |

Or use external DB (Neon, Supabase free tier) to save on database costs.
