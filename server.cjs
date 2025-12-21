/**
 * My Projects Pro - Update Server
 * 
 * A simple HTTP server to host application updates for auto-update functionality.
 * Run this on your PC or a dedicated server to distribute updates.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const CONFIG = {
  port: process.env.PORT || 3001, // Render provides PORT environment variable
  host: '0.0.0.0', // Listen on all interfaces (allows LAN access)
  releasesDir: path.join(__dirname, 'releases'),
  // GitHub repository configuration
  github: {
    owner: 'rafikhanmanyar-star',
    repo: 'update-server',
    apiUrl: 'https://api.github.com',
    // Optional: GitHub token for private repositories (set via GITHUB_TOKEN env var)
    token: process.env.GITHUB_TOKEN || null,
  },
  // Cache GitHub releases for 5 minutes
  cacheTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Cache for GitHub releases
let githubReleasesCache = {
  data: null,
  timestamp: null,
};

// MIME types for serving files
const MIME_TYPES = {
  '.exe': 'application/octet-stream',
  '.yml': 'text/yaml',
  '.yaml': 'text/yaml',
  '.json': 'application/json',
  '.blockmap': 'application/octet-stream',
  '.zip': 'application/zip',
  '.html': 'text/html',
};

// Ensure releases directory exists
try {
  if (!fs.existsSync(CONFIG.releasesDir)) {
    fs.mkdirSync(CONFIG.releasesDir, { recursive: true });
    console.log(`Created releases directory: ${CONFIG.releasesDir}`);
  }
} catch (error) {
  console.error('Error creating releases directory:', error);
  // Continue anyway - might fail on Render but that's okay
}

// Helper function to serve a file
function serveFile(resolvedPath, stats, req, res) {
  // Get MIME type
  const ext = path.extname(resolvedPath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  // Set headers
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Accept-Ranges', 'bytes');

  // Support range requests for large files (resume downloads)
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(resolvedPath, { start, end });
    stream.pipe(res);
    console.log(`  → 206 Partial Content: ${start}-${end}/${stats.size}`);
  } else {
    res.writeHead(200);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
    console.log(`  → 200 OK: ${path.basename(resolvedPath)} (${stats.size} bytes)`);
  }
}

// Helper function to send 404 response
function send404(res, filePath) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(`File Not Found: ${path.basename(filePath)}\n\nPlease ensure the file is uploaded to the releases directory on the server.`);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Log request
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${pathname} - ${req.headers['user-agent'] || 'Unknown'}`);

  // CORS headers (allow requests from anywhere)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only allow GET and HEAD methods
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Root path - show server info
  if (pathname === '/' || pathname === '') {
    getReleasesForDisplay((error, result) => {
      const releases = result && result.releases ? result.releases : [];
      const errorInfo = result && result.error ? result.error : null;
      const html = generateIndexPage(releases, errorInfo);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    return;
  }

  // API endpoint to check server status
  if (pathname === '/api/status') {
    getReleasesForDisplay((error, result) => {
      const releases = result && result.releases ? result.releases : [];
      const errorInfo = result && result.error ? result.error : null;
      const status = {
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        releases: releases,
        error: errorInfo,
        github: {
          owner: CONFIG.github.owner,
          repo: CONFIG.github.repo,
          repositoryUrl: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    });
    return;
  }

  // Explicit handler for latest.yml (critical for auto-updater)
  if (pathname === '/latest.yml' || pathname === '/latest.yaml') {
    const latestYmlPath = path.join(CONFIG.releasesDir, 'latest.yml');
    const resolvedPath = path.resolve(latestYmlPath);
    
    // Security check
    if (!resolvedPath.startsWith(path.resolve(CONFIG.releasesDir))) {
      console.error(`Security violation: ${resolvedPath} is outside releases directory`);
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(resolvedPath, (err, stats) => {
      if (err || !stats.isFile()) {
        console.error(`latest.yml not found at: ${resolvedPath}`);
        console.error(`Error: ${err ? err.message : 'Not a file'}`);
        console.error(`Releases directory exists: ${fs.existsSync(CONFIG.releasesDir)}`);
        if (fs.existsSync(CONFIG.releasesDir)) {
          const files = fs.readdirSync(CONFIG.releasesDir);
          console.error(`Files in releases directory: ${files.join(', ')}`);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('latest.yml not found');
        return;
      }

      // Read and serve the file
      fs.readFile(resolvedPath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error(`Error reading latest.yml: ${readErr.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error reading latest.yml');
          return;
        }

        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Content-Length', Buffer.byteLength(data, 'utf8'));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.writeHead(200);
        res.end(data);
        console.log(`  → 200 OK: latest.yml (${stats.size} bytes)`);
      });
    });
    return;
  }

  // General file handler - serve files from releases directory or proxy from GitHub
  const fileName = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  const filePath = path.join(CONFIG.releasesDir, fileName);
  const resolvedPath = path.resolve(filePath);
  
  // Security check - ensure we're only serving from releases directory
  if (!resolvedPath.startsWith(path.resolve(CONFIG.releasesDir))) {
    console.error(`Security violation: ${resolvedPath} is outside releases directory`);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found locally, try to proxy from GitHub Releases
      console.log(`  → 404 Not Found locally: ${resolvedPath}`);
      console.log(`  → Attempting to proxy from GitHub Releases...`);
      
      // Extract filename from path (already have it, but use basename for consistency)
      const searchFileName = path.basename(resolvedPath);
      
      // Try to find the file in GitHub Releases
      fetchGitHubReleases((error, releases) => {
        if (error || !releases || releases.length === 0) {
          send404(res, resolvedPath);
          return;
        }
        
        // Find the latest release that has the file
        let downloadUrl = null;
        for (const release of releases) {
          const asset = release.assets.find(a => 
            a.name === searchFileName || 
            a.name.toLowerCase() === searchFileName.toLowerCase() ||
            decodeURIComponent(a.name) === searchFileName
          );
          if (asset) {
            downloadUrl = asset.browser_download_url;
            break;
          }
        }
        
        if (downloadUrl) {
          console.log(`  → Proxying from GitHub: ${downloadUrl}`);
          // Proxy the download from GitHub
          https.get(downloadUrl, (githubRes) => {
            if (githubRes.statusCode === 200 || githubRes.statusCode === 302) {
              // Handle redirects
              if (githubRes.statusCode === 302) {
                const redirectUrl = githubRes.headers.location;
                https.get(redirectUrl, (redirectRes) => {
                  res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': redirectRes.headers['content-length'],
                  });
                  redirectRes.pipe(res);
                }).on('error', () => send404(res, resolvedPath));
              } else {
                res.writeHead(200, {
                  'Content-Type': 'application/octet-stream',
                  'Content-Length': githubRes.headers['content-length'],
                });
                githubRes.pipe(res);
              }
            } else {
              send404(res, resolvedPath);
            }
          }).on('error', () => send404(res, resolvedPath));
        } else {
          send404(res, resolvedPath);
        }
      });
      return;
    }
    
    // File exists, serve it
    serveFile(resolvedPath, stats, req, res);
  });
});

// Fetch releases from GitHub API
function fetchGitHubReleases(callback) {
  // Check cache first
  const now = Date.now();
  if (githubReleasesCache.data && githubReleasesCache.timestamp && 
      (now - githubReleasesCache.timestamp) < CONFIG.cacheTimeout) {
    console.log('Using cached GitHub releases');
    callback(null, githubReleasesCache.data);
    return;
  }

  const apiUrl = `${CONFIG.github.apiUrl}/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/releases`;
  console.log(`Fetching releases from GitHub: ${apiUrl}`);
  
  // Prepare headers
  const headers = {
    'User-Agent': 'My-Projects-Pro-Update-Server',
    'Accept': 'application/vnd.github.v3+json',
  };
  
  // Add authentication if token is provided
  if (CONFIG.github.token) {
    headers['Authorization'] = `token ${CONFIG.github.token}`;
    console.log('Using GitHub token for authentication');
  }

  https.get(apiUrl, { headers }, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const releases = JSON.parse(data);
          // Cache the results
          githubReleasesCache.data = releases;
          githubReleasesCache.timestamp = Date.now();
          console.log(`Fetched ${releases.length} release(s) from GitHub`);
          callback(null, releases);
        } catch (error) {
          console.error('Error parsing GitHub API response:', error);
          callback(error, null);
        }
      } else if (res.statusCode === 404) {
        // Provide helpful error message for 404
        let errorMessage = `Repository not found: ${CONFIG.github.owner}/${CONFIG.github.repo}`;
        try {
          const errorData = JSON.parse(data);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        const helpfulError = {
          code: 'REPO_NOT_FOUND',
          message: errorMessage,
          suggestions: [
            `Verify the repository exists at: https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
            'Check if the repository name is correct (case-sensitive)',
            'If the repository is private, set GITHUB_TOKEN environment variable',
            'Ensure the repository has at least one release created',
          ],
          repository: `${CONFIG.github.owner}/${CONFIG.github.repo}`,
        };
        
        console.error('GitHub API 404 Error:', helpfulError);
        callback(helpfulError, null);
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        // Authentication/authorization error
        const authError = {
          code: 'AUTH_ERROR',
          message: 'Authentication failed or repository access denied',
          suggestions: [
            'If repository is private, set GITHUB_TOKEN environment variable in Render',
            'Verify the token has access to the repository',
            'Check if the repository exists and is accessible',
          ],
        };
        console.error('GitHub API Auth Error:', authError);
        callback(authError, null);
      } else {
        let errorMessage = `GitHub API returned status ${res.statusCode}`;
        try {
          const errorData = JSON.parse(data);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Ignore parse errors
        }
        const error = new Error(errorMessage);
        error.statusCode = res.statusCode;
        console.error('GitHub API error:', error.message);
        callback(error, null);
      }
    });
  }).on('error', (error) => {
    console.error('Error fetching from GitHub API:', error);
    callback(error, null);
  });
}

// Get list of available releases (from GitHub)
function getAvailableReleases() {
  // For synchronous calls, return cached data or empty array
  if (githubReleasesCache.data) {
    return githubReleasesCache.data.map(release => ({
      tag: release.tag_name,
      name: release.name,
      published: release.published_at,
      assets: release.assets.map(asset => ({
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
      })),
    }));
  }
  return [];
}

// Get releases for display (async version)
function getReleasesForDisplay(callback) {
  fetchGitHubReleases((error, releases) => {
    if (error) {
      console.error('Error fetching releases:', error);
      // Return error info along with empty releases so we can display helpful message
      callback(error, { error: error, releases: [] });
    } else {
      // Format releases for display
      const formatted = releases.map(release => ({
        tag: release.tag_name,
        name: release.name || release.tag_name,
        published: release.published_at,
        body: release.body,
        assets: release.assets.map(asset => ({
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          downloadCount: asset.download_count,
        })),
      }));
      callback(null, { error: null, releases: formatted });
    }
  });
}

// Generate index HTML page
function generateIndexPage(releases = [], errorInfo = null) {
  let releasesList;
  let errorMessage = '';
  
  // Display error message if there's an error
  if (errorInfo) {
    const errorBox = `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #dc2626; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          ⚠️ Error Fetching Releases
        </h3>
        <p style="color: #991b1b; margin-bottom: 12px; font-weight: 500;">
          ${errorInfo.message || 'Failed to fetch releases from GitHub'}
        </p>
        ${errorInfo.suggestions ? `
          <ul style="color: #991b1b; margin-left: 20px; margin-top: 8px;">
            ${errorInfo.suggestions.map(s => `<li style="margin-bottom: 6px;">${s}</li>`).join('')}
          </ul>
        ` : ''}
        <p style="color: #991b1b; margin-top: 12px; font-size: 13px;">
          Repository: <a href="https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}" target="_blank" style="color: #dc2626; text-decoration: underline;">
            ${CONFIG.github.owner}/${CONFIG.github.repo}
          </a>
        </p>
      </div>
    `;
    errorMessage = errorBox;
  }
  
  if (releases.length > 0) {
    releasesList = releases.map(release => {
      const releaseDate = release.published ? new Date(release.published).toLocaleDateString() : 'Unknown';
      const assetsList = release.assets && release.assets.length > 0
        ? release.assets.map(asset => {
            const sizeMB = (asset.size / (1024 * 1024)).toFixed(2);
            return `
              <div style="margin-left: 20px; margin-top: 8px; padding: 8px; background: #f1f5f9; border-radius: 4px;">
                <a href="${asset.url}" target="_blank" style="color: #4f46e5; font-weight: 500; text-decoration: none;">
                  📦 ${asset.name}
                </a>
                <span style="color: #64748b; font-size: 12px; margin-left: 8px;">
                  (${sizeMB} MB${asset.downloadCount !== undefined ? `, ${asset.downloadCount} downloads` : ''})
                </span>
              </div>
            `;
          }).join('')
        : '<div style="margin-left: 20px; color: #64748b; font-size: 13px;">No assets available</div>';
      
      return `
        <li style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <strong style="color: #1e293b; font-size: 16px;">${release.name || release.tag}</strong>
            <span style="background: #4f46e5; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
              ${release.tag}
            </span>
            <span style="color: #64748b; font-size: 12px;">Published: ${releaseDate}</span>
          </div>
          ${assetsList}
        </li>
      `;
    }).join('');
  } else {
    releasesList = '<li><em>No releases available yet. Check GitHub repository for releases.</em></li>';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Projects Pro - Update Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      max-width: 800px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 14px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .content { padding: 32px; }
    .section { margin-bottom: 28px; }
    .section:last-child { margin-bottom: 0; }
    .section h2 {
      font-size: 18px;
      color: #1e293b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .section p {
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .section ul {
      list-style: none;
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .section li {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
      color: #475569;
    }
    .section li:last-child { border-bottom: none; }
    .section a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    .section a:hover { text-decoration: underline; }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #7c3aed;
      font-family: 'Courier New', monospace;
    }
    .endpoint {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      font-family: monospace;
      font-size: 13px;
      color: #334155;
      border-left: 3px solid #4f46e5;
    }
    .info-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .info-box h3 {
      font-size: 16px;
      color: #1e40af;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-box ul {
      list-style: disc;
      margin-left: 20px;
      color: #1e3a8a;
    }
    .info-box li {
      margin-bottom: 6px;
      font-size: 14px;
    }
    .help-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-left: 4px solid #22c55e;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .help-box h3 {
      font-size: 16px;
      color: #166534;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .help-box p {
      color: #166534;
      margin-bottom: 8px;
    }
    .help-box ol {
      margin-left: 20px;
      color: #166534;
    }
    .help-box li {
      margin-bottom: 8px;
      font-size: 14px;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .feature-item {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .feature-item strong {
      color: #1e293b;
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }
    .feature-item span {
      color: #64748b;
      font-size: 13px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 My Projects Pro</h1>
      <p>Update Server</p>
      <div class="status">
        <span class="status-dot"></span>
        <span>Server Online</span>
      </div>
    </div>
    <div class="content">
      <!-- Application Information Section -->
      <div class="section">
        <h2>ℹ️ About My Projects Pro</h2>
        <div class="info-box">
          <h3>📱 Application Overview</h3>
          <p><strong>My Projects Pro</strong> is a comprehensive Finance and Project Management Application designed to help you manage your projects, track finances, and stay organized.</p>
          <div class="feature-grid">
            <div class="feature-item">
              <strong>💼 Project Management</strong>
              <span>Organize and track your projects efficiently</span>
            </div>
            <div class="feature-item">
              <strong>💰 Finance Tracking</strong>
              <span>Monitor expenses and income</span>
            </div>
            <div class="feature-item">
              <strong>📊 Reports & Analytics</strong>
              <span>Generate insights from your data</span>
            </div>
            <div class="feature-item">
              <strong>💾 Secure Backup</strong>
              <span>Database-based backup system</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Help Section -->
      <div class="section">
        <h2>❓ Help & Support</h2>
        <div class="help-box">
          <h3>🔄 How to Update the Application</h3>
          <p>The application will automatically check for updates when you start it. If an update is available, you'll be prompted to download and install it.</p>
          <ol>
            <li><strong>Automatic Updates:</strong> The app checks for updates on startup. If a new version is available, you'll see a notification.</li>
            <li><strong>Manual Check:</strong> You can manually check for updates from the application's settings menu.</li>
            <li><strong>Download & Install:</strong> When an update is found, click "Download" and follow the installation wizard.</li>
            <li><strong>Restart:</strong> After installation, restart the application to use the new version.</li>
          </ol>
        </div>
        <div class="help-box">
          <h3>📥 Manual Download</h3>
          <p>If automatic updates don't work, you can manually download the latest version:</p>
          <ol>
            <li>Check the <strong>Available Releases</strong> section below for the latest version.</li>
            <li>Click on the release file to download it directly.</li>
            <li>Run the installer and follow the setup instructions.</li>
          </ol>
        </div>
        <div class="help-box">
          <h3>🆘 Troubleshooting</h3>
          <ul>
            <li><strong>Update not showing:</strong> Check your internet connection and ensure the application has permission to access the update server.</li>
            <li><strong>Download fails:</strong> Try downloading manually from the releases section below.</li>
            <li><strong>Installation issues:</strong> Make sure you have administrator privileges and close the application before installing updates.</li>
            <li><strong>Server status:</strong> If you see "Server Offline" above, the update server may be temporarily unavailable. Please try again later.</li>
          </ul>
        </div>
      </div>

      <!-- Available Releases Section -->
      <div class="section">
        <h2>📦 Available Releases</h2>
        ${errorMessage}
        <ul>
          ${releasesList}
        </ul>
        <p style="margin-top: 12px; font-size: 13px; color: #64748b;">
          <em>Note: Large executable files are hosted on GitHub Releases for faster downloads. Click on any file to download directly from GitHub.</em>
        </p>
      </div>

      <!-- API Information Section -->
      <div class="section">
        <h2>🔗 Update Endpoint</h2>
        <div class="endpoint">
          GET /latest.yml
        </div>
        <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
          This endpoint provides the latest version information in YAML format for automatic updates.
        </p>
      </div>

      <div class="section">
        <h2>📋 API Endpoints</h2>
        <ul>
          <li><code>GET /</code> - This information page</li>
          <li><code>GET /api/status</code> - Server status (JSON format)</li>
          <li><code>GET /latest.yml</code> - Latest version information (YAML format)</li>
          <li><code>GET /releases/{filename}</code> - Download release files</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>My Projects Pro Update Server v1.0.0</p>
      <p style="margin-top: 4px;">For support, please contact your system administrator</p>
    </div>
  </div>
</body>
</html>`;
}

// Start server
server.listen(CONFIG.port, CONFIG.host, () => {
  const interfaces = require('os').networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 My Projects Pro - Update Server');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Server is running at:');
  console.log(`    • Local:    http://localhost:${CONFIG.port}`);
  addresses.forEach(addr => {
    console.log(`    • Network:  http://${addr}:${CONFIG.port}`);
  });
  console.log('');
  console.log('  Releases directory:');
  console.log(`    ${CONFIG.releasesDir}`);
  console.log('');
  console.log('  To add a new release:');
  console.log('    1. Build your app: npm run electron:build:win');
  console.log('    2. Copy these files to the releases folder:');
      console.log('       - My Projects Pro Setup X.X.X.exe');
      console.log('       - My Projects Pro Setup X.X.X.exe.blockmap');
  console.log('       - latest.yml');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${CONFIG.port} is already in use.`);
    console.error(`   Try changing the port in CONFIG.port or stop the other process.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

