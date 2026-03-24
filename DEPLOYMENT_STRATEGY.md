# 🚀 Deployment & Load Balancing Strategy

**Project:** Shree Classes Proctored Web App  
**Version:** 2.0.0  
**Prepared:** March 23, 2026

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Load Balancing Strategies](#load-balancing-strategies)
3. [Deployment Options](#deployment-options)
4. [Production Configuration](#production-configuration)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling Strategy](#scaling-strategy)
8. [Disaster Recovery](#disaster-recovery)
9. [Cost Estimates](#cost-estimates)

---

## 🏗️ Architecture Overview

### Current Architecture (Single Server)
```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Nginx (Front)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│Backend │  │Frontend│
│:5000   │  │:5173   │
└────────┘  └────────┘
         │
         ▼
┌─────────────────┐
│   SQLite DB     │
└─────────────────┘
```

### Target Architecture (Load Balanced)
```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Load Balancer  │◄─── Health Checks
│  (Nginx/ALB)    │
└────┬──────┬─────┘
     │      │
     │      │
     ▼      ▼
┌─────────┐ ┌─────────┐
│Backend 1│ │Backend 2│  ◄── Auto-scaling Group
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           │
     ┌─────┴─────┐
     │  Redis    │  ◄── Session/Cache
     │  Cluster  │
     └─────┬─────┘
           │
     ┌─────┴─────┐
     │ PostgreSQL│  ◄── Primary DB
     │  (RDS)    │
     └───────────┘
```

---

## ⚖️ Load Balancing Strategies

### Strategy 1: Nginx Load Balancer (Recommended for Start)

**Configuration:**
```nginx
upstream backend_servers {
    least_conn;
    server backend1.example.com:5000 weight=1 max_fails=3 fail_timeout=30s;
    server backend2.example.com:5000 weight=1 max_fails=3 fail_timeout=30s;
    server backend3.example.com:5000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.shreescienceacademy.com;

    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 75s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

**Pros:**
- ✅ Simple to set up
- ✅ Cost-effective
- ✅ Full control
- ✅ Works with existing infrastructure

**Cons:**
- ❌ Manual scaling
- ❌ Single point of failure (unless clustered)
- ❌ Requires manual health monitoring

**Best For:** 1,000-10,000 concurrent users

---

### Strategy 2: AWS Application Load Balancer (ALB)

**Architecture:**
```
Users → CloudFront CDN → ALB → Auto Scaling Group (EC2) → RDS PostgreSQL
```

**Configuration:**
- **Load Balancer:** AWS ALB (Layer 7)
- **Target Group:** EC2 instances or ECS tasks
- **Health Check:** `/health` endpoint every 30s
- **Stickiness:** Enabled for exam sessions (1 hour)

**Auto Scaling Policy:**
```json
{
  "TargetTrackingConfiguration": {
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 60.0
  },
  "MinSize": 2,
  "MaxSize": 10
}
```

**Pros:**
- ✅ Auto-scaling
- ✅ Built-in health checks
- ✅ High availability
- ✅ Managed service

**Cons:**
- ❌ Higher cost
- ❌ AWS vendor lock-in

**Estimated Cost:** $50-200/month (depending on traffic)

**Best For:** 10,000-100,000 concurrent users

---

### Strategy 3: Kubernetes Cluster (Enterprise)

**Architecture:**
```
Users → Ingress Controller → Kubernetes Services → Pods (Backend) → Cloud SQL
```

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    spec:
      containers:
      - name: backend
        image: shree-classes/backend:latest
        ports:
        - containerPort: 5000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

**Pros:**
- ✅ Automatic scaling
- ✅ Self-healing
- ✅ Container orchestration
- ✅ Multi-cloud capable

**Cons:**
- ❌ Complex setup
- ❌ Requires DevOps expertise
- ❌ Higher operational overhead

**Best For:** 100,000+ concurrent users

---

## 🚀 Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - **RECOMMENDED**

**Frontend (Vercel):**
```bash
# Deploy
vercel deploy --prod

# Environment Variables
VITE_API_URL=https://api.shreescienceacademy.com
```

**Backend (Railway):**
```bash
# Deploy
railway up

# Environment Variables
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
ALLOWED_ORIGINS=https://shree-classes.vercel.app
```

**Pros:**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Zero DevOps

**Cons:**
- ❌ Limited customization
- ❌ Vendor dependency

**Cost:** $0-50/month (starting)

---

### Option 2: DigitalOcean Droplets

**Setup:**
```bash
# Create droplet (Ubuntu 22.04)
doctl compute droplet create backend-1 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --image ubuntu-22-04-x64 \
  --ssh-keys <key-fingerprint>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Deploy with Docker Compose
docker-compose up -d
```

**Docker Compose (Production):**
```yaml
version: '3.8'

services:
  backend:
    image: shree-classes/backend:latest
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=postgresql://user:pass@db:5432/proctored_exam
    depends_on:
      - db
    networks:
      - app-network

  frontend:
    image: shree-classes/frontend:latest
    restart: always
    environment:
      - VITE_API_URL=https://api.shreescienceacademy.com
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - app-network

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=proctored_exam
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=<strong-password>
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

**Cost:** $24-48/month (2-4 GB RAM droplets)

---

### Option 3: AWS EC2 with Elastic Beanstalk

**Setup:**
```bash
# Initialize EB
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

**Configuration (.ebextensions/01.config):**
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://...
  aws:elasticbeanstalk:environment:proxy:
    StaticFiles: /public
```

**Cost:** $30-100/month (t3.medium instances)

---

## 🔧 Production Configuration

### Backend Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://shree-classes.vercel.app,https://shreescienceacademy.com

# Security
JWT_SECRET=<64-character-random-string>
JWT_EXPIRE=1h
BCRYPT_ROUNDS=12

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:password@host:5432/proctored_exam
SQLITE_DB_PATH=  # Leave empty for PostgreSQL

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Proctoring
PROCTOR_VIOLATION_THRESHOLD=5
PROCTOR_AUTO_SUBMIT=true

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@shreescienceacademy.com
SMTP_PASS=<app-password>
SMTP_FROM=Shree Classes <noreply@shreescienceacademy.com>

# GitHub Backup (Optional)
GITHUB_TOKEN=<github-pat>
GITHUB_OWNER=Shree-Classes
GITHUB_REPO=exam-data-backup

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/app/backend.log

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Frontend Environment Variables

```env
# API
VITE_API_URL=https://api.shreescienceacademy.com

# Feature Flags
VITE_ENABLE_PROCTORING=true
VITE_ENABLE_ANALYTICS=true

# CDN (Optional)
VITE_CDN_URL=https://cdn.shreescienceacademy.com
```

---

## 🔒 Security Hardening

### 1. HTTPS Enforcement

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.shreescienceacademy.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.shreescienceacademy.com;

    ssl_certificate /etc/letsencrypt/live/api.shreescienceacademy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.shreescienceacademy.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 2. Database Security

**PostgreSQL Configuration:**
```sql
-- Create dedicated user
CREATE USER app_user WITH PASSWORD '<strong-password>';
GRANT CONNECT ON DATABASE proctored_exam TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Enable SSL
ALTER SYSTEM SET ssl = on;

-- Limit connections
ALTER USER app_user CONNECTION LIMIT 100;
```

### 3. Firewall Rules (UFW)

```bash
# Enable firewall
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Deny all other incoming
ufw default deny incoming
ufw default allow outgoing

# Enable logging
ufw logging on
```

---

## 📊 Monitoring & Logging

### 1. Application Monitoring

**Winston Logger Configuration:**
```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/app/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: '/var/log/app/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});
```

### 2. Performance Monitoring

**Options:**
- **New Relic** (Free tier: 100 GB/month)
- **Datadog** (Paid, comprehensive)
- **Prometheus + Grafana** (Self-hosted, free)

**Prometheus Metrics Endpoint:**
```javascript
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({ register: client.register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ 
      method: req.method, 
      route: req.route?.path || req.path, 
      status_code: res.statusCode 
    });
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### 3. Uptime Monitoring

**Services:**
- **UptimeRobot** (Free: 50 monitors, 5-min intervals)
- **Pingdom** (Paid, advanced features)
- **StatusCake** (Free tier available)

**Health Check Endpoint:**
```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'up',
      memory: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
    }
  };

  try {
    // Check database
    db.prepare('SELECT 1').get();
    health.checks.database = 'up';
  } catch (err) {
    health.checks.database = 'down';
    health.status = 'unhealthy';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

---

## 📈 Scaling Strategy

### Horizontal Scaling (Recommended)

**When to Scale:**
- CPU > 70% for 5 minutes
- Memory > 80% for 5 minutes
- Response time > 500ms (p95)
- Request queue > 100

**Scaling Plan:**

| Concurrent Users | Backend Instances | DB Type | RAM per Instance | Cost/Month |
|-----------------|-------------------|---------|------------------|------------|
| 0-1,000 | 1 | SQLite | 2 GB | $0-25 |
| 1,000-5,000 | 2 | PostgreSQL | 4 GB | $50-100 |
| 5,000-20,000 | 3-5 | PostgreSQL + Redis | 8 GB | $150-300 |
| 20,000-50,000 | 5-10 | PostgreSQL Cluster + Redis | 16 GB | $400-800 |
| 50,000+ | 10+ | Sharded DB + Redis Cluster | 32 GB | $1000+ |

### Database Scaling

**Phase 1: SQLite (Current)**
- Good for: < 1,000 users
- Limitation: Single file, no concurrent writes

**Phase 2: PostgreSQL (Recommended)**
```bash
# Migration script
npm run migrate:sqlite-to-postgres
```

**Phase 3: Read Replicas**
- Primary: Write operations
- Replicas: Read operations (exam listing, analytics)

**Phase 4: Sharding (If needed)**
- Shard by: `exam_id` or `user_id`
- Use: Citus or manual sharding

---

## 🆘 Disaster Recovery

### Backup Strategy

**Automated Backups:**
```bash
# Daily database backup (cron job)
0 2 * * * pg_dump proctored_exam | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 tar -czf /backups/full-$(date +\%Y\%m\%d).tar.gz /var/log/app /etc/nginx
```

**GitHub Backup (Existing):**
- Syncs every 5 minutes
- Stores Excel exports
- Version controlled

### Recovery Procedures

**Database Restore:**
```bash
# Restore from backup
gunzip < db-20260323.sql.gz | psql proctored_exam

# Verify
psql -c "SELECT COUNT(*) FROM users;" proctored_exam
```

**Application Rollback:**
```bash
# Docker rollback
docker rollback backend

# Git rollback
git revert HEAD
git push origin main
```

---

## 💰 Cost Estimates

### Startup Phase (< 5,000 users)

| Service | Provider | Cost/Month |
|---------|----------|------------|
| Frontend Hosting | Vercel | $0 (Free) |
| Backend Hosting | Railway | $25 |
| Database | Railway PostgreSQL | $15 |
| Domain | Namecheap | $1 |
| SSL | Let's Encrypt | $0 |
| Email | Gmail SMTP | $0 |
| Monitoring | UptimeRobot | $0 |
| **Total** | | **$41/month** |

### Growth Phase (5,000-20,000 users)

| Service | Provider | Cost/Month |
|---------|----------|------------|
| Frontend CDN | Cloudflare | $0 (Free) |
| Load Balancer | DigitalOcean | $12 |
| Backend (3 instances) | DigitalOcean | $72 |
| Database (Managed) | DigitalOcean | $30 |
| Redis Cache | DigitalOcean | $15 |
| Monitoring | New Relic | $0 (Free tier) |
| Logging | Logtail | $29 |
| **Total** | | **$158/month** |

### Scale Phase (20,000-100,000 users)

| Service | Provider | Cost/Month |
|---------|----------|------------|
| Load Balancer | AWS ALB | $25 |
| Backend (Auto-scale) | AWS EC2 | $200-400 |
| Database (RDS) | AWS RDS | $150 |
| Redis (ElastiCache) | AWS | $50 |
| CDN | Cloudflare | $20 (Pro) |
| Monitoring | Datadog | $100 |
| Logging | Datadog | $50 |
| **Total** | | **$595-795/month** |

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (run `npm test` in both frontend and backend)
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Rate limiting enabled
- [ ] CORS configured for production domains

### Deployment Day

- [ ] Deploy backend first
- [ ] Run database migrations
- [ ] Verify health endpoint
- [ ] Deploy frontend
- [ ] Test all critical paths
- [ ] Monitor error logs
- [ ] Check performance metrics

### Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check error rates (< 1%)
- [ ] Verify backup jobs running
- [ ] Test disaster recovery
- [ ] Document any issues
- [ ] Update documentation

---

## 🎯 Recommended Deployment Path

**For Immediate Deployment (This Week):**

1. **Frontend:** Deploy to Vercel (free, instant)
2. **Backend:** Deploy to Railway ($25/month)
3. **Database:** Use Railway PostgreSQL ($15/month)
4. **Domain:** Configure DNS
5. **SSL:** Automatic via Vercel/Railway

**Total Cost:** ~$40/month  
**Setup Time:** 2-3 hours  
**Maintenance:** Minimal

**Migration Path:**
- Month 1-3: Vercel + Railway
- Month 4-6: Move to DigitalOcean if costs increase
- Month 6+: Consider AWS/Kubernetes if scaling needed

---

**Last Updated:** March 23, 2026  
**Next Review:** After 10,000 users
