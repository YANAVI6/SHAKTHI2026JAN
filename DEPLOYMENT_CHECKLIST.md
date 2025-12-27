# Deployment Checklist for Shakti CRM

Use this checklist to ensure all steps are completed correctly when setting up and deploying Shakti CRM.

## Pre-Deployment Checklist

### 1. Supabase Setup
- [ ] Created Supabase account
- [ ] Created new Supabase project
- [ ] Saved database password securely
- [ ] Copied Project URL
- [ ] Copied anon/public key
- [ ] Copied service_role key
- [ ] Copied database connection string

### 2. Database Migration
- [ ] Opened Supabase SQL Editor
- [ ] Ran `SINGLE_MIGRATION.sql` file
- [ ] Verified all 19 tables were created
- [ ] Verified super_admins table has default admin user
- [ ] Checked for any SQL errors

### 3. Environment Configuration
- [ ] Created `.env` file in project root
- [ ] Added `VITE_SUPABASE_URL` to .env
- [ ] Added `VITE_SUPABASE_ANON_KEY` to .env
- [ ] Added `VITE_SUPABASE_SERVICE_ROLE_KEY` to .env
- [ ] Verified .env file is in .gitignore
- [ ] Never committed .env to version control

### 4. Project Setup
- [ ] Node.js 18+ installed
- [ ] Ran `npm install` successfully
- [ ] Ran `npm run build` successfully
- [ ] No build errors or critical warnings
- [ ] Tested dev server with `npm run dev`

### 5. GitHub Setup
- [ ] Created GitHub account
- [ ] Initialized git repository (`git init`)
- [ ] Created GitHub repository on github.com
- [ ] Added remote origin
- [ ] Pushed code to GitHub (`git push -u origin main`)
- [ ] Verified all files uploaded correctly
- [ ] Confirmed .env file NOT on GitHub

## Deployment Steps

### Option A: Vercel Deployment
- [ ] Logged into Vercel account
- [ ] Imported GitHub repository
- [ ] Set framework preset to "Vite"
- [ ] Set build command to `npm run build`
- [ ] Set output directory to `dist`
- [ ] Added environment variables:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] VITE_SUPABASE_SERVICE_ROLE_KEY
- [ ] Triggered deployment
- [ ] Verified deployment successful
- [ ] Tested deployed application

### Option B: Netlify Deployment
- [ ] Logged into Netlify account
- [ ] Connected GitHub repository
- [ ] Set build command to `npm run build`
- [ ] Set publish directory to `dist`
- [ ] Added environment variables in site settings
- [ ] Deployed site
- [ ] Verified deployment successful
- [ ] Tested deployed application

### Option C: Custom VPS/Server
- [ ] Server provisioned (Ubuntu 20.04+ recommended)
- [ ] Node.js installed on server
- [ ] Nginx or Apache configured
- [ ] SSL certificate installed
- [ ] Uploaded project files
- [ ] Created .env file on server
- [ ] Ran `npm install --production`
- [ ] Ran `npm run build`
- [ ] Configured web server to serve from `dist/`
- [ ] Set up PM2 or similar process manager
- [ ] Configured firewall rules
- [ ] Set up automated backups

## Post-Deployment Verification

### 1. Application Access
- [ ] Can access application URL
- [ ] Homepage loads correctly
- [ ] No console errors in browser
- [ ] All static assets loading (CSS, images, fonts)
- [ ] Responsive design works on mobile

### 2. Super Admin Access
- [ ] Can access super admin login page
- [ ] Can login with default credentials (admin/admin123)
- [ ] Super admin dashboard loads
- [ ] Changed default password immediately
- [ ] Logout and re-login with new password works

### 3. Create First Tenant
- [ ] Created first tenant from super admin panel
- [ ] Tenant has valid slug (lowercase, alphanumeric, hyphens)
- [ ] Tenant appears in tenant list
- [ ] Can view tenant details

### 4. Create Company Admin
- [ ] Created company admin for tenant
- [ ] Company admin credentials saved securely
- [ ] Company admin appears in admin list
- [ ] Can verify admin details

### 5. Company Admin Login
- [ ] Can access login page
- [ ] Can login with company admin credentials
- [ ] Company admin dashboard loads
- [ ] All menu items accessible
- [ ] No errors in console

### 6. Basic Functionality Tests
- [ ] Can create employees (Team Leaders & Telecallers)
- [ ] Can create teams
- [ ] Can assign team leaders to teams
- [ ] Can configure custom columns
- [ ] Can upload cases (test with small Excel file)
- [ ] Cases appear in case list
- [ ] Can assign cases to telecallers
- [ ] Can create notifications

### 7. Telecaller Dashboard Test
- [ ] Can login as telecaller
- [ ] Dashboard loads with metrics
- [ ] Can view assigned cases
- [ ] Can update case status
- [ ] Can log calls
- [ ] Can set PTP dates
- [ ] Can record payments
- [ ] Notifications work

### 8. Database Verification
- [ ] Run verification queries in Supabase SQL Editor
- [ ] Check data is being inserted correctly
- [ ] Verify foreign key relationships
- [ ] Check indexes are created
- [ ] Monitor database performance

```sql
-- Verify data exists
SELECT COUNT(*) FROM super_admins;
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM company_admins;
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM customer_cases;
```

## Security Checklist

### Authentication & Authorization
- [ ] Changed default super admin password
- [ ] All passwords are strong (12+ characters)
- [ ] Password hashing working correctly
- [ ] Session management working
- [ ] Logout functionality working
- [ ] Auto-logout on inactivity configured (if applicable)

### Data Security
- [ ] Environment variables not exposed in code
- [ ] API keys kept secure
- [ ] Database credentials not in version control
- [ ] RLS policies reviewed (or disabled for custom auth)
- [ ] SQL injection prevention verified
- [ ] XSS protection verified

### Network Security
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] API rate limiting considered
- [ ] Firewall rules configured
- [ ] DDoS protection considered

### Monitoring
- [ ] Error logging set up
- [ ] Performance monitoring configured
- [ ] Database backup scheduled
- [ ] Uptime monitoring configured
- [ ] Security audit logs being recorded

## Performance Checklist

### Frontend Optimization
- [ ] Production build created (`npm run build`)
- [ ] Assets minified
- [ ] Images optimized
- [ ] Lazy loading implemented where needed
- [ ] Bundle size acceptable (warnings addressed)

### Database Optimization
- [ ] Indexes created on frequently queried columns
- [ ] Query performance tested
- [ ] Connection pooling configured
- [ ] Database backup strategy in place

### Server Configuration
- [ ] Gzip compression enabled
- [ ] Caching headers configured
- [ ] CDN configured (optional)
- [ ] Load balancing configured (if needed)

## Documentation Checklist

- [ ] README.md updated with project info
- [ ] COMPLETE_SETUP_GUIDE.md reviewed
- [ ] GITHUB_SETUP.md reviewed
- [ ] Environment variables documented
- [ ] API endpoints documented (if applicable)
- [ ] User manual created (if needed)
- [ ] Admin manual created (if needed)

## Training & Handover

- [ ] Super admin trained on system
- [ ] Company admin trained on system
- [ ] Team leaders trained on system
- [ ] Telecallers trained on system
- [ ] Training materials provided
- [ ] Support contact information shared
- [ ] Escalation procedures defined

## Backup & Recovery

- [ ] Database backup configured in Supabase
- [ ] Backup frequency set (daily recommended)
- [ ] Backup retention policy defined
- [ ] Recovery procedure documented
- [ ] Recovery tested at least once
- [ ] Disaster recovery plan in place

## Maintenance Plan

- [ ] Update schedule defined
- [ ] Dependency update process established
- [ ] Security patch process defined
- [ ] Performance monitoring schedule set
- [ ] Regular audit schedule established
- [ ] Support process defined

## Sign-Off

### Project Team
- [ ] Developer sign-off: _________________ Date: _______
- [ ] QA sign-off: _________________ Date: _______
- [ ] Project Manager sign-off: _________________ Date: _______

### Client/Stakeholder
- [ ] Super Admin sign-off: _________________ Date: _______
- [ ] Company Admin sign-off: _________________ Date: _______

## Important URLs

Record these for future reference:

- **Production URL**: _________________________________
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Repository**: _________________________________
- **Deployment Platform**: _________________________________
- **Support Email**: _________________________________
- **Documentation**: _________________________________

## Emergency Contacts

- **Technical Support**: _________________________________
- **Database Admin**: _________________________________
- **Server Admin**: _________________________________
- **Project Manager**: _________________________________

---

## Quick Command Reference

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build

# Git
git status          # Check status
git add .           # Stage all changes
git commit -m "msg" # Commit changes
git push            # Push to GitHub

# Deployment
# (Platform-specific commands)
```

---

**Notes:**

Use this space to record any project-specific notes, customizations, or special configurations:

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

---

**Checklist Version**: 1.0
**Last Updated**: 2025-12-18
