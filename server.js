/**
 * My Projects Pro - Update Server
 * 
 * A simple HTTP server to host application updates for auto-update functionality.
 * Run this on your PC or a dedicated server to distribute updates.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const CONFIG = {
  port: 3001,
  host: '0.0.0.0', // Listen on all interfaces (allows LAN access)
  releasesDir: path.join(__dirname, 'releases'),
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
if (!fs.existsSync(CONFIG.releasesDir)) {
  fs.mkdirSync(CONFIG.releasesDir, { recursive: true });
  console.log(`Created releases directory: ${CONFIG.releasesDir}`);
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
    const html = generateIndexPage();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // API endpoint to check server status
  if (pathname === '/api/status') {
    const status = {
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      releases: getAvailableReleases(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
    return;
  }

  // Serve files from releases directory
  // Remove leading /releases/ if present, or just leading /
  let filePath;
  if (pathname.startsWith('/releases/')) {
    filePath = path.join(CONFIG.releasesDir, pathname.slice(10));
  } else {
    filePath = path.join(CONFIG.releasesDir, pathname.slice(1));
  }

  // Security: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(CONFIG.releasesDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log(`  → 404 Not Found: ${resolvedPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

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
      console.log(`  → 200 OK: ${stats.size} bytes`);
    }
  });
});

// Get list of available releases
function getAvailableReleases() {
  try {
    const files = fs.readdirSync(CONFIG.releasesDir);
    return files.filter(f => f.endsWith('.exe') || f.endsWith('.yml'));
  } catch {
    return [];
  }
}

// Generate index HTML page
function generateIndexPage() {
  const releases = getAvailableReleases();
  const releasesList = releases.length > 0
    ? releases.map(f => `<li><a href="/releases/${f}">${f}</a></li>`).join('\n')
    : '<li><em>No releases available yet</em></li>';

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
      max-width: 600px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
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
    .section { margin-bottom: 24px; }
    .section h2 {
      font-size: 16px;
      color: #374151;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
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
    }
    .section a:hover { text-decoration: underline; }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #7c3aed;
    }
    .endpoint {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      font-family: monospace;
      font-size: 13px;
      color: #334155;
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
      <div class="section">
        <h2>📦 Available Releases</h2>
        <ul>
          ${releasesList}
        </ul>
      </div>
      <div class="section">
        <h2>🔗 Update Endpoint</h2>
        <div class="endpoint">
          GET /latest.yml
        </div>
      </div>
      <div class="section">
        <h2>📋 API Endpoints</h2>
        <ul>
          <li><code>GET /</code> - This page</li>
          <li><code>GET /api/status</code> - Server status JSON</li>
          <li><code>GET /latest.yml</code> - Latest version info</li>
          <li><code>GET /{filename}</code> - Download file</li>
        </ul>
      </div>
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

