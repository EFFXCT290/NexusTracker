# ■ NexusTracker
## Originaly Forked from SqTracker
[![License GPLv3](https://badgen.net/badge/license/GPLv3/blue)](./LICENSE)

A modern, feature-rich BitTorrent tracker platform designed for both private and public communities.

## 🚀 Quick Start Guide

### ⚠️ Important Security Note
- Never expose MongoDB ports to the public internet without proper security measures
- Always use strong passwords for database users
- Keep your config.js file secure and never commit it with sensitive information

### 1. Set up MongoDB Database:

Create a \`docker-compose.yml\` for MongoDB:
```bash
yaml
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - /home/MongoDB:/data/db
    restart: always # Automatically restart the container if it crashes
    environment: #optional configuration
      MONGO_INITDB_ROOT_USERNAME: "root_username" #set root username
      MONGO_INITDB_ROOT_PASSWORD: "root_password" #set root password
    command: [--auth]  # This is ESSENTIAL for authentication
```

Deploy MongoDB and verify:
1. Start MongoDB: \`docker-compose up -d mongodb\`
2. Verify it's working by accessing \`ipaddress:27017\`
3. Connect to MongoDB:
```bash
mongosh -u [username set on docker-compose.yml]
```

Set up the database:
```bash
# Create database
use nexustracker

# Create database user
db.createUser({
  user: "username",
  pwd: "password",
  roles: [{ role: "dbOwner", db: "nexustracker" }]
})
```
# Verify user creation
```bash
show users
```

Configure remote access:
# Access MongoDB container
```bash
docker exec -it "containerid" bash
```
# Install nano
```bash
apt update && apt install nano
```

# Edit MongoDB config
```bash
nano /etc/mongod.conf.orig
```

# Change bind address: 127.0.0.1 → 0.0.0.0

# Add under security section:
```bash
security:
  authorization: enabled
```

Restart MongoDB container to apply changes.

### 2. Configure NexusTracker:
- Edit `config.js` with your preferences
- Default admin credentials: username `admin`, password `admin`
- Change admin password immediately after first login

### 3. Launch NexusTracker:
```bash
docker-compose up -d
```

### 4. Setup NGINX Proxy Manager
- Go to NPM at `http://your-ip:81/`
<img width="1663" alt="Step 01" src="https://raw.githubusercontent.com/EFFXCT290/NexusTracker/master/.github/images/NPM%20STEP%201.png">
- Click Add Proxy Host and change your ip/domain name (leave everything as it is in the picture!)
<img width="1663" alt="Step 01" src="https://raw.githubusercontent.com/EFFXCT290/NexusTracker/master/.github/images/NPM%20STEP%202.png">
- Apply The Custom NGINX Configuration and Click Save
  <img width="1663" alt="Step 01" src="https://raw.githubusercontent.com/EFFXCT290/NexusTracker/master/.github/images/NPM%20STEP%203.png">

```bash
location / {
    proxy_pass http://nexus_client:3000;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /api/ {
    rewrite /api/(.*) /$1 break;
    proxy_pass http://nexus_api:3001;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /sq/ {
    proxy_pass http://nexus_api:3001;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

- You Have Successfuly Setup NGINX Proxy Manager! 
<img width="1663" alt="Step 01" src="https://raw.githubusercontent.com/EFFXCT290/NexusTracker/master/.github/images/NPM%20STEP%204.png">
- Visit your tracker at `http://your-ip:80/` or `https://your-domain/`

## 💫 Core Features

### 👥 User Management
- Flexible registration modes:
  - Open registration
  - Closed registration
  - Invite-only system
- Two-factor authentication (2FA)
- Bonus points system
- Optional public browsing for SEO

### 📤 Torrent Management
- Rich metadata uploading
- Advanced search functionality
- Freeleech options
  - Per-torrent basis
  - Site-wide campaigns
- Content grouping
- Bookmark system

### 📊 Tracking & Statistics
- Comprehensive upload/download tracking
- Ratio management
- Hit'n'run monitoring
- User limitations based on:
  - Ratio requirements
  - HnR status
  - Custom rules
- Bonus points for seeding

### 🤝 Community Tools
- Torrent commenting
- Voting system
- Request system
- Wiki platform
- Announcements
- User interactions

### 🛡️ Administration
- Staff privilege system
- Content moderation
- Reporting system
- Advanced statistics
- User management tools
- Ban/unban capabilities

## 🌐 System Components

NexusTracker operates with four key components:

1. **API Service**
   - Handles user authentication
   - Manages torrent operations
   - Implements BitTorrent protocol
   - Provides RSS feeds

2. **Client Service**
   - Modern web interface
   - Responsive design
   - Real-time updates

3. **MongoDB Database**
   - Stores user data
   - Manages torrent information
   - Tracks statistics

4. **Nginx Proxy**
   - Routes traffic
   - Handles SSL/TLS
   - Provides security layer

## 🌍 Translations

Currently supported languages:
- English
- Russian
- Esperanto
- German
- Simplified Chinese
- French
- Spanish
- Italian

Want to add your language? Create a new JSON file in `client/locales/` with your translations!

## 📸 Screenshots

Splash screen
<img width="1663" alt="splash" src="https://user-images.githubusercontent.com/6264509/218762121-e7800d27-c5f1-4288-ba6e-f33c235b9b27.png">

Home
<img width="1707" alt="home" src="https://user-images.githubusercontent.com/6264509/218762088-e604d1d6-7f6a-4910-b7ff-500e0e762056.png">

Torrent
<img width="1707" alt="torrent" src="https://user-images.githubusercontent.com/6264509/218762124-70d00f99-287a-4efa-90ed-47db7a0be39b.png">

Upload
<img width="1707" alt="upload" src="https://user-images.githubusercontent.com/6264509/218762133-0a359ca0-6a18-4440-80f6-6d28adba1a6f.png">

Categories
<img width="1707" alt="categories" src="https://user-images.githubusercontent.com/6264509/218762073-b1d42889-2868-414e-af60-9fe75ba48ee1.png">

Profile
<img width="1663" alt="profile" src="https://user-images.githubusercontent.com/6264509/218762104-238c90ab-c144-42f1-869e-bbae120f556f.png">

Account
<img width="1663" alt="account" src="https://user-images.githubusercontent.com/6264509/218762053-90667723-db6e-473c-8ae0-11bc635f322e.png">

Announcement
<img width="1663" alt="announcement" src="https://user-images.githubusercontent.com/6264509/218762065-e91ca084-1f9a-4af5-9232-291d87625c7a.png">

Request
<img width="1663" alt="request" src="https://user-images.githubusercontent.com/6264509/218762116-38cf1b95-7c76-4476-9276-19f6c77c2c9a.png">

Report
<img width="1707" alt="report" src="https://user-images.githubusercontent.com/6264509/218762109-b76bd5f1-b333-4d09-9c9a-e2fa87b3c2de.png">


## 🤝 Contributing

We welcome contributions! Please check our [Contributing Guide](./CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Development setup
- Testing requirements

## 📄 License

GNU GPLv3

---

### 🆘 Need Help?

- Create an issue on GitHub for support
- Check existing issues for solutions
- Join our community discussions
