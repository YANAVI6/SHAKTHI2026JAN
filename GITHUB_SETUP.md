# GitHub Setup Guide

This guide will help you push your Shakti CRM code to GitHub.

## Prerequisites

- Git installed on your computer
- GitHub account created
- Command line/terminal access

## Step 1: Prepare Your Project

Make sure you're in the project directory:

```bash
cd /path/to/shakti-crm
```

## Step 2: Initialize Git (if not already done)

```bash
# Initialize git repository
git init

# Check git status
git status
```

## Step 3: Add Files to Git

```bash
# Add all files to git
git add .

# Check what's being committed
git status

# Create initial commit
git commit -m "Initial commit - Shakti CRM setup"
```

## Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `shakti-crm` (or your preferred name)
   - **Description**: "Shakti CRM - Multi-tenant Customer Relationship Management System"
   - **Visibility**: Choose Private (recommended) or Public
   - **DO NOT** check "Initialize with README" (we already have one)
   - **DO NOT** add .gitignore or license
3. Click "Create repository"

## Step 5: Connect to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote repository (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Verify remote was added
git remote -v

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main
```

## Step 6: Verify Upload

1. Go to your GitHub repository URL
2. Refresh the page
3. You should see all your files

## Common Git Commands

### Check Status
```bash
git status
```

### Add Changes
```bash
# Add specific file
git add filename.txt

# Add all changes
git add .

# Add all files in a directory
git add src/
```

### Commit Changes
```bash
# Commit with message
git commit -m "Your commit message here"

# Add and commit in one command
git commit -am "Your commit message"
```

### Push Changes
```bash
# Push to main branch
git push origin main

# Force push (use with caution!)
git push -f origin main
```

### Pull Changes
```bash
# Pull latest changes
git pull origin main
```

### View Commit History
```bash
# View commit log
git log

# View compact log
git log --oneline

# View last 5 commits
git log -5
```

### Create and Switch Branches
```bash
# Create new branch
git branch feature-name

# Switch to branch
git checkout feature-name

# Create and switch in one command
git checkout -b feature-name

# List all branches
git branch -a

# Delete branch
git branch -d feature-name
```

### Undo Changes
```bash
# Discard changes in file
git checkout -- filename.txt

# Unstage file
git reset HEAD filename.txt

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

## .gitignore File

Your project already has a `.gitignore` file. Here's what it ignores:

```
# dependencies
node_modules/

# production build
dist/
build/

# environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

**IMPORTANT**: Never commit `.env` files or sensitive credentials to GitHub!

## Working with Collaborators

### Add Collaborators

1. Go to your repository on GitHub
2. Click "Settings"
3. Click "Collaborators"
4. Click "Add people"
5. Enter their GitHub username or email

### Clone Repository (for collaborators)

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

## Best Practices

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good examples
git commit -m "Add telecaller dashboard component"
git commit -m "Fix PTP date filter issue"
git commit -m "Update README with setup instructions"

# Bad examples
git commit -m "fixed stuff"
git commit -m "update"
git commit -m "asdf"
```

### Commit Frequency

- Commit often with small, logical changes
- Don't wait until the end of the day to commit everything
- Each commit should represent one logical change

### Branch Naming

Use descriptive branch names:

```bash
# Feature branches
feature/add-reports
feature/telecaller-dashboard

# Bug fix branches
fix/login-error
fix/ptp-date-filter

# Hotfix branches
hotfix/critical-security-issue
```

## Continuous Integration/Deployment

Your project includes a GitHub Actions workflow at `.github/workflows/ci.yml`.

This automatically:
- Runs tests on every push
- Checks code quality
- Builds the project

## Troubleshooting

### Issue: Authentication Failed

**Solution**: Use a Personal Access Token instead of password

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy the token
5. Use it as your password when pushing

### Issue: Remote Already Exists

```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### Issue: Merge Conflicts

```bash
# Pull changes first
git pull origin main

# Resolve conflicts in your editor
# Look for <<<<<<< HEAD markers

# After resolving, add and commit
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

### Issue: Accidentally Committed .env File

```bash
# Remove from git but keep local file
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from git"

# Push changes
git push origin main

# Make sure .env is in .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push origin main
```

## Protecting Sensitive Data

If you've accidentally pushed sensitive data:

1. Change all passwords/keys immediately
2. Use GitHub's guide to remove sensitive data: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
3. Consider using git-filter-repo or BFG Repo-Cleaner

## Next Steps

After pushing to GitHub:

1. Set up branch protection rules
2. Configure GitHub Actions for CI/CD
3. Add a LICENSE file
4. Set up GitHub Pages for documentation (optional)
5. Enable GitHub Discussions for community support (optional)

## Useful Links

- GitHub Documentation: https://docs.github.com
- Git Cheat Sheet: https://education.github.com/git-cheat-sheet-education.pdf
- Pro Git Book: https://git-scm.com/book/en/v2

---

**You're all set!** Your code is now on GitHub and ready for collaboration.
