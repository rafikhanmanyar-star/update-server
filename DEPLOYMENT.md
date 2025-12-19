# Deployment Guide - My Projects Pro Update Server

This guide covers deploying the update server to Render for production use.

## Quick Deploy Checklist

- [ ] GitHub repository created
- [ ] Files pushed to GitHub
- [ ] Render account created
- [ ] Web Service created on Render
- [ ] Service deployed successfully
- [ ] Release files uploaded
- [ ] App's package.json updated with Render URL
- [ ] Tested update check from app

## Detailed Steps

### 1. Prepare GitHub Repository

1. Create a new repository on GitHub:
   - Name: `my-projects-pro-update-server`
   - Description: "Update server for My Projects Pro"
   - Visibility: Private (recommended) or Public

2. Initialize and push:
   ```bash
   cd update-server
   git init
   git add .
   git commit -m "Initial commit: Update server for My Projects Pro"
   git remote add origin https://github.com/YOUR_USERNAME/my-projects-pro-update-server.git
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy to Render

1. **Create Render Account**:
   - Visit [render.com](https://render.com)
   - Sign up with GitHub (recommended for easy integration)

2. **Create Web Service**:
   - Dashboard → "New +" → "Web Service"
   - Connect GitHub repository
   - Select: `my-projects-pro-update-server`

3. **Configure Service**:
   ```
   Name: my-projects-pro-update-server
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: (leave empty)
   Start Command: node server.cjs
   Instance Type: Free
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Note your service URL: `https://my-projects-pro-update-server.onrender.com`

### 3. Upload Release Files

**Important**: Render free tier doesn't support SSH. All files must be committed to Git and pushed to GitHub. Render will automatically deploy when you push changes.

1. **Build your application**:
   ```bash
   npm run electron:build:win
   ```

2. **Copy release files to your local repository**:
   - From: `C:\MyProjectsProBuild\release\`
   - To: `update-server/releases/` (in your local Git repository)
   - Files needed:
     - `My Projects Pro Setup X.X.X.exe`
     - `My Projects Pro Setup X.X.X.exe.blockmap`
     - `latest.yml`

3. **Commit and push to GitHub**:
   ```bash
   cd update-server
   git add releases/
   git commit -m "Add release version X.X.X"
   git push
   ```

4. **Render automatically deploys**:
   - Render detects the push to GitHub
   - Automatically redeploys with new files
   - Takes 1-2 minutes
   - Check Render dashboard for deployment status

**Note**: If your .exe files are very large (>100MB), GitHub may reject them. See "Large Files" section below.

### 4. Update App Configuration

In your main project's `package.json`, update the publish URL:

```json
"publish": {
  "provider": "generic",
  "url": "https://my-projects-pro-update-server.onrender.com/",
  "channel": "latest"
}
```

### 5. Test the Deployment

1. **Test server directly**:
   - Visit: `https://your-service-name.onrender.com`
   - Should see the update server info page

2. **Test API endpoints**:
   - `https://your-service-name.onrender.com/api/status`
   - `https://your-service-name.onrender.com/latest.yml`

3. **Test from app**:
   - Build and run your Electron app
   - Check for updates (should connect to Render)

## Troubleshooting

### Deployment Fails

- **Check Render logs**: Dashboard → Your Service → Logs
- **Verify package.json exists**: Must be in root of repository
- **Check start command**: Should be `node server.cjs`
- **Verify Node version**: Render uses Node 18+ by default

### Files Not Accessible

- **Check releases folder**: Must exist in repository
- **Verify file paths**: Files should be in `releases/` directory
- **Check file permissions**: Ensure files are committed to Git

### Service Spins Down

- **Free tier limitation**: Services spin down after 15 min inactivity
- **Solution**: Use UptimeRobot to ping every 5 minutes
- **Or upgrade**: Paid plans don't spin down

### Update Check Fails

- **Verify URL**: Check `package.json` has correct Render URL
- **Check HTTPS**: Render provides HTTPS automatically
- **Test manually**: Visit the URL in browser first
- **Check logs**: Render logs show all requests

## Updating Releases

To add a new release (no SSH needed - use Git):

1. **Build new version**:
   ```bash
   npm run electron:build:win
   ```

2. **Copy files locally**:
   - Copy from `C:\MyProjectsProBuild\release\` to `update-server/releases/`
   - Files: `.exe`, `.blockmap`, `latest.yml`

3. **Commit and push to GitHub**:
   ```bash
   cd update-server
   git add releases/
   git commit -m "Release version X.X.X"
   git push
   ```

4. **Render auto-deploys**:
   - Render detects GitHub push
   - Automatically redeploys (1-2 minutes)
   - Check Render dashboard for status

5. **Users get update**:
   - Next app launch will check for updates
   - Update notification appears if new version available

## Large Files (GitHub File Size Limits)

**GitHub Limits**:
- Files > 50MB: Warning
- Files > 100MB: Rejected

**If your .exe files are too large**:

### Option 1: Use Git LFS (Large File Storage)
```bash
# Install Git LFS
git lfs install

# Track .exe and .blockmap files
git lfs track "*.exe"
git lfs track "*.blockmap"

# Commit and push
git add .gitattributes
git add releases/
git commit -m "Add release with LFS"
git push
```

### Option 2: Exclude from Git, Upload Separately
1. Add to `.gitignore`:
   ```
   *.exe
   *.blockmap
   ```

2. Use alternative hosting for large files:
   - Upload to cloud storage (Google Drive, Dropbox, etc.)
   - Use direct download links in `latest.yml`
   - Or use a CDN service

### Option 3: Use GitHub Releases
- Create a GitHub Release
- Upload .exe files as release assets
- Update your update server to point to GitHub Releases API

## Environment Variables

The server uses these environment variables:

- `PORT`: Automatically set by Render (don't set manually)
- `NODE_ENV`: Set to `production` on Render

## File Structure

```
update-server/
├── server.cjs          # Main server file
├── package.json        # Node.js package config
├── render.yaml         # Render deployment config (optional)
├── .gitignore          # Git ignore rules
├── .renderignore       # Render ignore rules
├── README.md           # Documentation
├── DEPLOYMENT.md       # This file
└── releases/           # Release files directory
    ├── latest.yml
    ├── My Projects Pro Setup X.X.X.exe
    └── My Projects Pro Setup X.X.X.exe.blockmap
```

## Support

For issues:
1. Check Render logs
2. Verify GitHub repository
3. Test endpoints manually
4. Check app's update configuration

