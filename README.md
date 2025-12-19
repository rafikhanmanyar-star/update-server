# My Projects Pro - Update Server

A simple HTTP server to host application updates for auto-update functionality.

## Quick Start

### Local Development
```bash
node server.cjs
```

Or use the batch file:
```bash
start-server.bat
```

### Cloud Deployment (Render)

1. Push this repository to GitHub
2. Connect to Render and deploy as a Web Service
3. Render will automatically detect the configuration from `render.yaml`

## Configuration

The server fetches releases from GitHub Releases API:
- Repository: `rafikhanmanyar-star/MyProjectsPro`
- Update this in `server.cjs` if needed

## Files

- `server.cjs` - Main server file
- `releases/latest.yml` - Update metadata (points to GitHub Releases)
- `render.yaml` - Render deployment configuration
- `package.json` - Node.js dependencies

## Endpoints

- `GET /` - Server information page
- `GET /latest.yml` - Latest version information (for auto-updater)
- `GET /api/status` - Server status (JSON)
