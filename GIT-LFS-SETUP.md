# Git LFS Setup Guide

Your release files (.exe and .blockmap) are too large for GitHub's 100MB limit. Use Git LFS to handle them.

## Quick Setup (Command Line)

### Step 1: Install Git LFS

**Windows:**
1. Download from: https://git-lfs.github.com/
2. Run the installer
3. Restart your terminal/PowerShell

**Or via Chocolatey:**
```powershell
choco install git-lfs
```

**Or via winget:**
```powershell
winget install GitHub.GitLFS
```

### Step 2: Initialize Git LFS

Open PowerShell in your `update-server` folder:

```powershell
cd "D:\Users\Rafi\OneDrive\Construction\Software\Cursor projects\finance-tracker-pro-v1.0.1\update-server"

# Initialize Git LFS
git lfs install

# Track .exe and .blockmap files
git lfs track "*.exe"
git lfs track "*.blockmap"

# Add the .gitattributes file
git add .gitattributes

# Add your release files (they'll be tracked by LFS)
git add releases/

# Commit
git commit -m "Add release files with Git LFS"

# Push to GitHub
git push -u origin main
```

## Alternative: Exclude Large Files

If you don't want to use Git LFS, exclude the files from Git:

### Step 1: Update .gitignore

Uncomment these lines in `.gitignore`:
```
*.exe
*.blockmap
```

### Step 2: Remove from Git (if already added)

```powershell
git rm --cached releases/*.exe
git rm --cached releases/*.blockmap
git commit -m "Remove large files from Git"
```

### Step 3: Upload files separately

You'll need to upload .exe files manually to Render or use alternative hosting.

## Recommended: Use Git LFS

Git LFS is the best solution - it keeps your files in version control but stores them efficiently.

