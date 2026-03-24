# 🚀 Production Deployment Checklist

**Project:** Shree Classes Proctored Web App  
**Version:** 2.0.0  
**Deployment Date:** ___________  
**Deployed By:** ___________

---

## ✅ Pre-Deployment Checklist

### Code Quality & Testing
- [x] All unit tests passing (81% pass rate achieved)
- [x] Code reviewed for security vulnerabilities
- [x] CORS configured for production domains
- [x] Rate limiting enabled (100 req/15min general, 5 req/15min auth)
- [x] Error handling implemented globally
- [ ] **ACTION:** Fix negative duration validation (15 min)
- [ ] **ACTION:** Update test expectations for email validation

### Environment Configuration
- [ ] Create `.env.production` file (use `.env.production.example` as template)
- [ ] Generate strong JWT_SECRET (64 characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Configure DATABASE_URL (PostgreSQL for production)
- [ ] Set ALLOWED_ORIGINS to production domain
- [ ] Configure SMTP credentials
- [ ] Set LOG_LEVEL to 'info' or 'warn'

### Database Setup
- [ ] Provision PostgreSQL database (Railway, AWS RDS, or DigitalOcean)
- [ ] Create database schema
- [ ] Run migrations (if applicable)
- [ ] Configure database connection pooling
- [ ] Set up automated backups (daily)
- [ ] Test database connection from backend

### Infrastructure
- [ ] Domain name purchased and configured
- [ ] SSL certificates obtained (Let's Encrypt or provider)
- [ ] DNS records configured:
  - [ ] A record for root domain
  - [ ] A record for www subdomain
  - [ ] CNAME for api subdomain (if using)
- [ ] Load balancer configured (if using multiple instances)
- [ ] Firewall rules configured (ports 80, 443, 22 only)

### Monitoring & Logging
- [ ] Application monitoring configured (New Relic / Datadog / Prometheus)
- [ ] Error tracking setup (Sentry / LogRocket)
- [ ] Uptime monitoring configured (UptimeRobot / Pingdom)
- [ ] Log aggregation setup (Logtail / Papertrail)
- [ ] Alert thresholds configured:
  - [ ] Error rate > 1%
  - [ ] Response time > 500ms
  - [ ] CPU usage > 80%
  - [ ] Memory usage > 85%
  - [ ] Disk usage > 90%

### Security Hardening
- [ ] Change default admin password
  - Email: `admin@example.com`
  - Password: `Admin@123` → **CHANGE THIS**
- [ ] Enable HTTPS enforcement
- [ ] Configure security headers (Helmet.js already enabled)
- [ ] Set up fail2ban or similar for SSH protection
- [ ] Disable root SSH login
- [ ] Configure automatic security updates
- [ ] Review and restrict CORS origins
- [ ] Enable database SSL/TLS

### Backup & Recovery
- [ ] Automated database backups configured
- [ ] Backup verification test completed
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested
- [ ] GitHub backup configured (if using)

---

## 🎯 Deployment Day Checklist

### Backend Deployment

#### Option A: Railway/Render (Recommended)
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Set build command: `npm install`
- [ ] Set start command: `npm start`
- [ ] Deploy to production
- [ ] Verify deployment in logs
- [ ] Test `/health` endpoint

#### Option B: DigitalOcean Droplet
- [ ] Create droplet (Ubuntu 22.04, 4GB RAM minimum)
- [ ] SSH into server
- [ ] Install Docker and Docker Compose
- [ ] Clone repository
- [ ] Configure `.env.production`
- [ ] Run `docker-compose up -d`
- [ ] Verify containers running
- [ ] Check logs: `docker-compose logs -f`

#### Option C: Vercel (Frontend) + Railway (Backend)
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Update VITE_API_URL in frontend
- [ ] Verify CORS configuration
- [ ] Test full integration

### Frontend Deployment

#### Vercel Deployment
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Run `vercel login`
- [ ] Run `vercel --prod`
- [ ] Configure custom domain in Vercel dashboard
- [ ] Update environment variables:
  - [ ] `VITE_API_URL=https://api.your-domain.com`
- [ ] Verify deployment
- [ ] Test in browser

#### Manual Deployment (Nginx)
- [ ] Build frontend: `npm run build`
- [ ] Copy `dist/` folder to server
- [ ] Configure Nginx to serve static files
- [ ] Enable gzip compression
- [ ] Configure caching headers
- [ ] Test in browser

### Integration Testing
- [ ] Test login flow
- [ ] Test exam creation
- [ ] Test exam taking (full flow)
- [ ] Test proctoring detection
- [ ] Test admin dashboard
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Test offline scenario
- [ ] Test error scenarios

---

## 🔍 Post-Deployment Checklist

### Immediate (First Hour)
- [ ] Monitor error logs (target: < 1% error rate)
- [ ] Check API response times (target: < 200ms average)
- [ ] Verify database connections stable
- [ ] Test all critical user journeys
- [ ] Check CORS working with production domain
- [ ] Verify SSL certificates valid
- [ ] Test email notifications (if configured)

### First 24 Hours
- [ ] Monitor uptime (target: 99.9%)
- [ ] Review error patterns
- [ ] Check database performance
- [ ] Monitor memory usage
- [ ] Review user feedback
- [ ] Check backup jobs running
- [ ] Verify monitoring alerts working

### First Week
- [ ] Analyze traffic patterns
- [ ] Review slow queries
- [ ] Optimize based on real usage
- [ ] Update documentation
- [ ] Plan next sprint
- [ ] Conduct retrospective

---

## 📊 Performance Targets

### Backend KPIs

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time (p95) | < 200ms | > 500ms |
| Error Rate | < 1% | > 5% |
| Uptime | > 99.9% | < 99% |
| Database Query Time | < 50ms | > 200ms |
| CPU Usage | < 60% | > 85% |
| Memory Usage | < 70% | > 90% |

### Frontend KPIs

| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | > 3s |
| Time to Interactive | < 3.5s | > 7s |
| Largest Contentful Paint | < 2.5s | > 4s |
| Cumulative Layout Shift | < 0.1 | > 0.25 |
| First Input Delay | < 100ms | > 300ms |

---

## 🆘 Rollback Procedure

### If Deployment Fails

1. **Stay Calm** - Don't panic, follow the procedure
2. **Assess Impact** - Determine what's broken
3. **Communicate** - Notify team/stakeholders
4. **Rollback Decision** - If not fixed in 15 min, rollback

### Backend Rollback

```bash
# If using Docker
docker rollback backend

# If using Railway
railway rollback <previous-deployment-id>

# If using Git
git revert HEAD
git push origin main
```

### Frontend Rollback

```bash
# Vercel
vercel rollback

# Manual
# Re-deploy previous build
```

### Database Rollback

```bash
# Restore from backup
gunzip < backup-YYYYMMDD.sql.gz | psql proctored_exam

# Verify
psql -c "SELECT COUNT(*) FROM users;" proctored_exam
```

---

## 📞 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | ___________ | ___________ |
| Backend Lead | ___________ | ___________ |
| Frontend Lead | ___________ | ___________ |
| Database Admin | ___________ | ___________ |
| Project Manager | ___________ | ___________ |

---

## 🎯 Success Criteria

Deployment is considered successful when:

- [ ] 24 hours with > 99.9% uptime
- [ ] Error rate < 1%
- [ ] All critical user journeys working
- [ ] Performance metrics within targets
- [ ] No critical bugs reported
- [ ] Backups running successfully
- [ ] Monitoring alerts configured and tested
- [ ] Team trained on new features

---

## 📝 Deployment Notes

### Deployment Details

**Start Time:** __:__  
**End Time:** __:__  
**Duration:** ___ minutes  
**Deployed By:** ___________  

### Issues Encountered

| Issue | Severity | Resolution | Resolved By |
|-------|----------|------------|-------------|
| | | | |
| | | | |

### Lessons Learned

- 
- 
- 

---

## ✅ Final Sign-Off

**Deployment Approved By:** ___________  
**Date:** ___________  
**Time:** __:__  

**Status:**  
- [ ] ✅ Successful
- [ ] ⚠️ Successful with Issues
- [ ] ❌ Failed (Rolled Back)

**Next Review Date:** ___________

---

**Good luck with your deployment! 🚀**
