# Fix Repository Structure

## Problem

Your `latest.yml` file is at the **root** of the repository, but the server expects it in the `releases/` folder.

## Current Structure (Wrong)
```
My-Project-Pro-new-updates/
├── server.cjs
├── package.json
├── latest.yml          ← Currently here (WRONG)
├── README.md
└── .gitattributes
```

## Correct Structure (What Server Expects)
```
My-Project-Pro-new-updates/
├── server.cjs
├── package.json
├── releases/           ← Need this folder
│   └── latest.yml      ← Should be here
├── README.md
└── .gitattributes
```

## How to Fix

### Option 1: Move in GitHub Desktop (Easiest)

1. **Create releases folder:**
   - In GitHub Desktop, right-click in the repository
   - Or create it in File Explorer: `update-server/releases/`

2. **Move latest.yml:**
   - Drag `latest.yml` from root into `releases/` folder
   - Or copy it to `releases/latest.yml`

3. **Commit the change:**
   - GitHub Desktop will show the move
   - Commit: "Move latest.yml to releases folder"
   - Push to GitHub

4. **Render will auto-deploy** with the correct structure

### Option 2: Move via File Explorer

1. Open File Explorer
2. Navigate to your local repository folder
3. Create `releases` folder if it doesn't exist
4. Move `latest.yml` into `releases/` folder
5. In GitHub Desktop, commit and push

## After Moving

The server will be able to find `latest.yml` because:
- Server looks in: `releases/` directory
- File will be at: `releases/latest.yml` ✅

## Verify

After moving and pushing:

1. **Check GitHub:** `latest.yml` should be in `releases/` folder
2. **Test Render:** Visit `https://your-service.onrender.com/api/status`
3. **Should see:** `latest.yml` in the releases array

