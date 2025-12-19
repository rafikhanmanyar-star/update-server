# GitHub Releases Setup - Alternative for Large Files

Since your `.exe` files are too large for Git (>100MB), we'll use **GitHub Releases** to host them instead.

## How It Works

1. **Repository**: Contains server code and `latest.yml` (small files)
2. **GitHub Releases**: Hosts the actual `.exe` and `.blockmap` files
3. **Update Server**: Serves `latest.yml` which points to GitHub Releases URLs
4. **Electron App**: Downloads updates from GitHub Releases

## Step-by-Step Setup

### Step 1: Push Repository Without Large Files

1. Make sure `.gitignore` excludes `.exe` and `.blockmap` files ✓ (already done)
2. In GitHub Desktop:
   - Uncheck all `.exe` and `.blockmap` files
   - Commit only: `server.cjs`, `package.json`, `latest.yml`, and other small files
   - Push to GitHub

### Step 2: Deploy to Render

1. Deploy your repository to Render (without .exe files)
2. Render will serve `latest.yml` and the server code
3. Your service URL: `https://your-service-name.onrender.com`

### Step 3: Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Fill in:
   - **Tag**: `v1.0.4` (match your version)
   - **Release title**: `My Projects Pro v1.0.4`
   - **Description**: Release notes (optional)
4. **Attach files**:
   - Drag and drop: `My Projects Pro Setup 1.0.4.exe`
   - Drag and drop: `My Projects Pro Setup 1.0.4.exe.blockmap`
5. Click "Publish release"

### Step 4: Update latest.yml to Point to GitHub Releases

After creating the release, GitHub provides direct download URLs:
- `https://github.com/YOUR_USERNAME/my-projects-pro-update-server/releases/download/v1.0.4/My%20Projects%20Pro%20Setup%201.0.4.exe`
- `https://github.com/YOUR_USERNAME/my-projects-pro-update-server/releases/download/v1.0.4/My%20Projects%20Pro%20Setup%201.0.4.exe.blockmap`

Update your `latest.yml` file to use these URLs, then commit and push.

### Step 5: Update Your App's package.json

Update the publish URL to point to your Render service:

```json
"publish": {
  "provider": "generic",
  "url": "https://your-service-name.onrender.com/",
  "channel": "latest"
}
```

## Workflow for New Releases

### When you build a new version:

1. **Build your app**:
   ```bash
   npm run electron:build:win
   ```

2. **Create GitHub Release**:
   - Go to GitHub → Releases → "Create a new release"
   - Tag: `v1.0.5` (new version)
   - Upload: `.exe` and `.blockmap` files

3. **Update latest.yml**:
   - Update version number
   - Update file URLs to point to new GitHub Release
   - Update file sizes and SHA512 hashes

4. **Commit and push latest.yml**:
   ```bash
   git add latest.yml
   git commit -m "Update to version 1.0.5"
   git push
   ```

5. **Render auto-deploys** with new `latest.yml`

6. **Users get update** on next app launch

## Benefits

✅ No file size limits (GitHub Releases supports large files)
✅ No Git LFS needed
✅ Works with Render free tier
✅ Simple workflow
✅ Direct download from GitHub CDN (fast)

## latest.yml Format

Your `latest.yml` should look like this:

```yaml
version: 1.0.4
files:
  - url: https://github.com/YOUR_USERNAME/my-projects-pro-update-server/releases/download/v1.0.4/My%20Projects%20Pro%20Setup%201.0.4.exe
    sha512: [hash from electron-builder]
    size: [file size]
path: My Projects Pro Setup 1.0.4.exe
sha512: [hash from electron-builder]
releaseDate: '2024-01-15T10:00:00.000Z'
```

## Getting GitHub Release URLs

After uploading files to a GitHub Release:

1. Go to the release page
2. Right-click on the file → "Copy link address"
3. Use that URL in `latest.yml`

Or construct the URL manually:
```
https://github.com/USERNAME/REPO/releases/download/TAG/FILENAME
```

Replace:
- `USERNAME`: Your GitHub username
- `REPO`: Repository name
- `TAG`: Release tag (e.g., `v1.0.4`)
- `FILENAME`: File name (URL-encoded, spaces become `%20`)

## Example

If your release is:
- Repository: `my-projects-pro-update-server`
- Tag: `v1.0.4`
- File: `My Projects Pro Setup 1.0.4.exe`

URL would be:
```
https://github.com/YOUR_USERNAME/my-projects-pro-update-server/releases/download/v1.0.4/My%20Projects%20Pro%20Setup%201.0.4.exe
```

