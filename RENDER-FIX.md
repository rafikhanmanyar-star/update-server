# Fix Render Deployment Error

## Error: Cannot find module '/opt/render/project/src/server.cjs'

This error means Render is looking in the wrong directory.

## Solution 1: Check Root Directory in Render Dashboard

1. Go to Render Dashboard
2. Click your service: `my-projects-pro-update-server`
3. Go to **Settings** tab
4. Scroll to **Build & Deploy** section
5. Find **Root Directory** field
6. **IMPORTANT**: Set it to `.` (single dot) or leave it **completely empty**
7. **DO NOT** set it to `src` or any other path
8. Click **Save Changes**
9. Go to **Manual Deploy** → **Clear build cache & deploy**

## Solution 2: Verify Repository Structure

Your repository should have this structure at the root:
```
my-projects-pro-update-server/
├── server.cjs          ← Must be here
├── package.json        ← Must be here
├── releases/
│   └── latest.yml
└── render.yaml
```

**NOT** like this:
```
my-projects-pro-update-server/
└── update-server/
    ├── server.cjs      ← Wrong location
    └── package.json
```

## Solution 3: Check Start Command

In Render Settings → **Start Command** should be:
```
node server.cjs
```

**NOT**:
- `node src/server.cjs`
- `node update-server/server.cjs`
- Any path with folders

## Solution 4: Verify Files Are Committed

Make sure these files are in your GitHub repository:
1. Go to your GitHub repository
2. Check that `server.cjs` is at the root (not in a subfolder)
3. Check that `package.json` is at the root

## Solution 5: If Repository Has Wrong Structure

If your repository has files in a subfolder (like `update-server/server.cjs`):

**Option A**: Move files to root
- Move all files from `update-server/` to repository root
- Commit and push

**Option B**: Set Root Directory in Render
- In Render Settings, set **Root Directory** to: `update-server`
- Update Start Command to: `node server.cjs` (relative to that directory)

## Quick Fix Checklist

- [ ] Root Directory in Render = `.` or (empty)
- [ ] Start Command = `node server.cjs`
- [ ] `server.cjs` is at repository root on GitHub
- [ ] `package.json` is at repository root on GitHub
- [ ] Cleared build cache and redeployed

## Still Not Working?

Check the Build Logs in Render:
1. Go to your service
2. Click **Logs** tab
3. Look for file structure output
4. See where Render is actually looking for files

