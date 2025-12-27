# Quick Start Guide - Shakti CRM

Get your Shakti CRM up and running in under 30 minutes!

## Overview

This guide provides the fastest path to get Shakti CRM deployed and operational.

## What You'll Need

- Supabase account (free tier works)
- GitHub account
- 20-30 minutes of your time

## Step-by-Step Setup

### Phase 1: Supabase Setup (10 minutes)

#### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `shakti-crm`
   - Password: *Create a strong password*
   - Region: *Choose closest to you*
4. Click "Create" and wait 2-3 minutes

#### 1.2 Get Your Credentials

1. Go to **Project Settings** → **API**
2. Copy these three values:
   - Project URL
   - anon/public key
   - service_role key
3. Save them in a text file (you'll need them soon)

#### 1.3 Set Up Database

1. Go to **SQL Editor** in Supabase
2. Open the file `SINGLE_MIGRATION.sql` from your project
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **RUN**
6. Wait for "Success" message

**Done!** Your database is ready with all 19 tables.

### Phase 2: Project Setup (5 minutes)

#### 2.1 Install Dependencies

```bash
# Navigate to project folder
cd shakti-crm

# Install packages
npm install
```

#### 2.2 Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the values with the credentials you saved earlier.

#### 2.3 Test Locally

```bash
# Build the project
npm run build

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

### Phase 3: GitHub Setup (5 minutes)

#### 3.1 Push to GitHub

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"
```

#### 3.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `shakti-crm`
3. Keep it Private
4. Don't initialize with anything
5. Click "Create repository"

#### 3.3 Push Code

```bash
# Add remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push code
git branch -M main
git push -u origin main
```

### Phase 4: Deploy to Vercel (5 minutes)

#### 4.1 Deploy

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework: Vite
   - Build: `npm run build`
   - Output: `dist`

#### 4.2 Add Environment Variables

In Vercel, add these environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

Click "Deploy"!

### Phase 5: First Login (5 minutes)

#### 5.1 Access Application

Visit your Vercel URL (something like `https://shakti-crm.vercel.app`)

#### 5.2 Super Admin Login

1. Click on "Super Admin Login" or go to `/super-admin`
2. Login with:
   - Username: `admin`
   - Password: `admin123`

#### 5.3 IMPORTANT: Change Password

**Immediately change the default password!**

#### 5.4 Create First Tenant

1. In Super Admin Dashboard, click "Create Tenant"
2. Fill in:
   - Company Name: *Your company*
   - Slug: `your-company` (lowercase, no spaces)
   - Contact details
3. Click "Create"

#### 5.5 Create Company Admin

1. Click "Manage Admins"
2. Create admin for your tenant
3. Save the credentials

#### 5.6 Login as Company Admin

1. Go to main login page
2. Use company admin credentials
3. Start setting up teams and employees!

## Verification

### Check Everything Works

- [ ] Can access application
- [ ] Super admin login works
- [ ] Created tenant successfully
- [ ] Created company admin
- [ ] Company admin can login
- [ ] Can create employees
- [ ] Can create teams
- [ ] Can upload cases (test with small file)

## What's Next?

### Immediate Next Steps

1. **Create Employees**
   - Add Team Leaders
   - Add Telecallers

2. **Set Up Teams**
   - Create teams
   - Assign team leaders
   - Add telecallers to teams

3. **Configure Columns**
   - Set up custom columns for your data
   - Configure display names
   - Set column order

4. **Upload Cases**
   - Prepare Excel file with customer data
   - Upload via Company Admin dashboard
   - Assign cases to teams

5. **Set Targets**
   - Set daily/weekly/monthly targets
   - For calls and collections

### Training Users

- Train team leaders on:
  - Case assignment
  - Performance monitoring
  - Report generation

- Train telecallers on:
  - Case management
  - Call logging
  - Status updates
  - Keyboard shortcuts

## Common Issues

### Issue: Build Fails

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Can't Connect to Supabase

- Check `.env` file exists
- Verify credentials are correct
- Check Supabase project is active

### Issue: Login Not Working

- Verify database migration ran successfully
- Check super_admins table has data:
  ```sql
  SELECT * FROM super_admins;
  ```
- Check browser console for errors

### Issue: GitHub Push Fails

```bash
# Check remote
git remote -v

# If wrong, remove and re-add
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Support Resources

### Documentation

- **Complete Guide**: See `COMPLETE_SETUP_GUIDE.md`
- **GitHub Setup**: See `GITHUB_SETUP.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`

### External Resources

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Vite Docs: https://vitejs.dev

## Default Accounts

### Super Admin
- Username: `admin`
- Password: `admin123`
- **CHANGE IMMEDIATELY!**

## Security Reminders

1. **Change default passwords** immediately
2. **Never commit** `.env` file to GitHub
3. **Use HTTPS** in production
4. **Enable 2FA** on GitHub and Supabase accounts
5. **Regular backups** of database

## Success Criteria

You're successfully set up when:

✅ Application is deployed and accessible
✅ Super admin can login
✅ Tenant is created
✅ Company admin can login
✅ Employees can be created
✅ Teams can be created
✅ Cases can be uploaded
✅ Telecallers can login and see cases

## Need Help?

If you get stuck:

1. Check the `COMPLETE_SETUP_GUIDE.md` for detailed instructions
2. Review `DEPLOYMENT_CHECKLIST.md` to ensure all steps completed
3. Check Supabase logs for database errors
4. Check browser console for frontend errors
5. Verify all environment variables are set correctly

## Estimated Time Breakdown

- Supabase setup: 10 minutes
- Project setup: 5 minutes
- GitHub setup: 5 minutes
- Deploy to Vercel: 5 minutes
- First login & setup: 5 minutes

**Total: ~30 minutes**

---

**Congratulations!** You now have a fully functional CRM system ready to use.

Start by creating your teams and uploading your first batch of cases!
