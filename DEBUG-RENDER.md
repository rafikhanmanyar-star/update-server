# Debug Render "Exited with status 1" Error

## What This Error Means

"Exited with status 1" means your application crashed during startup. We need to check the logs to see why.

## Step 1: Check Render Logs

1. Go to Render Dashboard
2. Click your service: `my-projects-pro-update-server`
3. Click **Logs** tab
4. Look for error messages (usually in red)
5. **Copy the full error message** - this will tell us what's wrong

## Common Causes & Fixes

### Cause 1: Syntax Error in server.cjs

**Check:** Look for "SyntaxError" or "Unexpected token" in logs

**Fix:** Verify server.cjs has no syntax errors

### Cause 2: Missing Dependencies

**Check:** Look for "Cannot find module" in logs

**Fix:** The server uses only Node.js built-in modules, so this shouldn't happen, but check logs

### Cause 3: Port Already in Use

**Check:** Look for "EADDRINUSE" in logs

**Fix:** The server uses `process.env.PORT` which Render provides, so this is unlikely

### Cause 4: File Path Issues

**Check:** Look for "ENOENT" (file not found) in logs

**Fix:** Make sure `releases` folder exists in the repository

### Cause 5: Node.js Version Issue

**Check:** Look for version-related errors

**Fix:** Render should use Node 18+ (specified in package.json)

## Step 2: Check Build Logs

1. In Render Dashboard → Your Service
2. Click **Events** tab
3. Look at the build process
4. Check if build completed successfully

## Step 3: Verify Files Are Correct

Make sure these files exist in your GitHub repository:
- ✅ `server.cjs` (at root)
- ✅ `package.json` (at root)
- ✅ `releases/` folder
- ✅ `releases/latest.yml`

## Step 4: Test Locally (Optional)

To test if server.cjs works:

```bash
cd update-server
node server.cjs
```

If it works locally but not on Render, it's a Render configuration issue.

## What to Share

Please share:
1. **Full error message** from Render Logs
2. **Build logs** (if any errors there)
3. **Any warnings** in the logs

This will help identify the exact issue.

