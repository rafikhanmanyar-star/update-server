# GitHub Token Setup for Update Server

## Problem
If you're seeing this error:
```
Error fetching releases: {
  code: 'AUTH_ERROR',
  message: 'Authentication failed or repository access denied'
}
```

This means the update server cannot access your GitHub repository. This happens when:
1. The repository is **private** (requires authentication)
2. The repository name is **incorrect** in the server configuration
3. The GitHub token is **missing or invalid**

## Solution

### Step 1: Verify Repository Name

Check `update-server/server.cjs` line 21-22:
```javascript
github: {
  owner: 'rafikhanmanyar-star',
  repo: 'update-server',  // ← Verify this matches your actual repository name
```

**Important**: The repository name must match exactly (case-sensitive).

Common repository names might be:
- `update-server`
- `MyProjectsPro`
- `finance-tracker-pro-v1.0.1`
- Or your actual repository name

### Step 2: Check if Repository is Private

1. Go to: `https://github.com/rafikhanmanyar-star/[your-repo-name]`
2. If you see a lock icon 🔒, the repository is **private**
3. If it's private, you **must** set up a GitHub token

### Step 3: Create GitHub Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `Update Server Token`
4. Select scopes:
   - ✅ **`repo`** (Full control of private repositories)
     - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

### Step 4: Add Token to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your **update-server** service
3. Go to **Environment** tab
4. Click **"Add Environment Variable"**
5. Add:
   - **Key**: `GITHUB_TOKEN`
   - **Value**: `[paste your token here]`
6. Click **"Save Changes"**
7. Render will automatically restart your service

### Step 5: Verify It Works

1. Wait for Render to restart (usually 30-60 seconds)
2. Visit your update server: `https://update-server-y6ps.onrender.com/`
3. Check the status page - it should show releases without errors
4. Or check: `https://update-server-y6ps.onrender.com/api/status`

## Alternative: Make Repository Public

If you don't want to use a token, you can make the repository public:

1. Go to your repository on GitHub
2. Click **Settings** → **General**
3. Scroll down to **"Danger Zone"**
4. Click **"Change visibility"** → **"Make public"**
5. Confirm

**Note**: Making it public means anyone can see your releases, but they still can't access your source code unless you make the entire repo public.

## Troubleshooting

### Still Getting AUTH_ERROR?

1. **Verify token is set in Render**:
   - Go to Render Dashboard → Your Service → Environment
   - Check that `GITHUB_TOKEN` exists and has a value

2. **Verify token has correct permissions**:
   - Token must have `repo` scope for private repositories
   - Token must have access to the specific repository

3. **Verify repository name**:
   - Check `server.cjs` line 22 - must match GitHub exactly
   - Repository name is case-sensitive

4. **Check token hasn't expired**:
   - GitHub tokens can expire if you set an expiration date
   - Generate a new token if needed

5. **Verify repository exists**:
   - Visit: `https://github.com/rafikhanmanyar-star/[repo-name]`
   - Make sure the repository exists and you have access

### Testing Locally

To test locally, create a `.env` file in the `update-server` folder:
```
GITHUB_TOKEN=your_token_here
```

Then run:
```bash
node server.cjs
```

## Security Notes

- **Never commit the token to Git** - it's already in `.gitignore`
- **Use environment variables** - never hardcode tokens
- **Rotate tokens periodically** - generate new tokens every 90 days
- **Use minimal permissions** - only grant `repo` scope if needed

## Current Configuration

Check your current setup in `update-server/server.cjs`:
- Owner: `rafikhanmanyar-star`
- Repository: `update-server` (verify this is correct!)
- Token: Set via `GITHUB_TOKEN` environment variable

If your repository name is different, update line 22 in `server.cjs`:
```javascript
repo: 'your-actual-repo-name',  // Change this
```

