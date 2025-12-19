# Troubleshooting: Releases Not Showing

## Why Releases Aren't Listed

### Reason 1: .exe Files Are Excluded (Expected)

Your `.gitignore` excludes `.exe` files (they're too large for GitHub). This is **correct** - they should be on GitHub Releases, not in the repository.

**What you should see:**
- ✅ `latest.yml` should be listed
- ❌ `.exe` files will NOT be listed (they're excluded)

### Reason 2: latest.yml Not Committed

If `latest.yml` is not showing:

1. **Check if it's committed:**
   - In GitHub Desktop, check if `releases/latest.yml` is committed
   - If not, commit and push it

2. **Verify on GitHub:**
   - Go to your repository on GitHub
   - Check if `releases/latest.yml` exists
   - If not, it wasn't pushed

### Reason 3: Server Can't Read Files

The server might not have access to the files. Check:

1. **Visit the API endpoint:**
   ```
   https://your-service-name.onrender.com/api/status
   ```
   This shows what files the server can see.

2. **Check server logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for any file system errors

## How to Test

### Test 1: Check API Status
Visit: `https://your-service-name.onrender.com/api/status`

You should see JSON with a `releases` array. It should include `latest.yml`.

### Test 2: Access latest.yml Directly
Visit: `https://your-service-name.onrender.com/latest.yml`

You should see the YAML content.

### Test 3: Check Homepage
Visit: `https://your-service-name.onrender.com/`

The "Available Releases" section should list `latest.yml`.

## Expected Behavior

Since `.exe` files are excluded from Git:

✅ **Should show:**
- `latest.yml`

❌ **Won't show:**
- `*.exe` files (they're on GitHub Releases)
- `*.blockmap` files (they're on GitHub Releases)

## Solution

1. **Make sure `latest.yml` is committed:**
   ```bash
   # In GitHub Desktop
   - Check releases/latest.yml is committed
   - Push to GitHub
   ```

2. **Verify on GitHub:**
   - Go to your repository
   - Check `releases/latest.yml` exists

3. **Redeploy on Render:**
   - Render should auto-deploy after push
   - Or manually trigger deployment

4. **Test the endpoints:**
   - `/api/status` - Should list `latest.yml`
   - `/latest.yml` - Should show file content
   - `/` - Should list `latest.yml` in releases

## If latest.yml Still Doesn't Show

1. **Check Render logs** for file system errors
2. **Verify file permissions** (should be fine on Render)
3. **Check if releases folder exists** in the deployed code
4. **Try accessing directly:** `https://your-service-name.onrender.com/releases/latest.yml`

