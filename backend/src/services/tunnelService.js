const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const CLOUDFLARED_URL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const BIN_DIR = path.join(__dirname, '../bin');
const BIN_PATH = path.join(BIN_DIR, 'cloudflared.exe');

let tunnelProcess = null;

/**
 * Downloads cloudflared executable if not present
 */
function downloadCloudflared() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(BIN_PATH)) {
      return resolve(BIN_PATH);
    }

    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    console.log('[Cloudflare Tunnel] Downloading cloudflared.exe for client machine...');
    logger.info('[Cloudflare Tunnel] Downloading cloudflared.exe...');

    const file = fs.createWriteStream(BIN_PATH);

    function getWithRedirect(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return getWithRedirect(res.headers.location);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download cloudflared: HTTP ${res.statusCode}`));
        }

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log('[Cloudflare Tunnel] Download complete: ' + BIN_PATH);
            logger.info('[Cloudflare Tunnel] cloudflared.exe downloaded successfully');
            resolve(BIN_PATH);
          });
        });
      }).on('error', (err) => {
        fs.unlink(BIN_PATH, () => {});
        reject(err);
      });
    }

    getWithRedirect(CLOUDFLARED_URL);
  });
}

/**
 * Updates dynamic tunnel URL in Supabase database so frontend can discover it
 */
async function updateSupabaseTunnelUrl(publicUrl) {
  try {
    await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('backend_url', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [publicUrl]
    );
    console.log(`[Cloudflare Tunnel] Synced active URL into Supabase: ${publicUrl}`);
    logger.info(`[Cloudflare Tunnel] Synced active URL into Supabase: ${publicUrl}`);
  } catch (error) {
    console.error('[Cloudflare Tunnel] Could not sync tunnel URL to Supabase:', error.message);
  }
}

/**
 * Starts Cloudflare tunnel and extracts the public https URL
 */
async function startTunnel(port = 5000) {
  try {
    const executable = await downloadCloudflared();

    console.log('[Cloudflare Tunnel] Establishing secure tunnel for local port ' + port + '...');
    
    // Spawn cloudflared tunnel
    tunnelProcess = spawn(executable, ['tunnel', '--url', `http://localhost:${port}`]);

    let detectedUrl = null;

    const handleOutput = async (data) => {
      const output = data.toString();

      // Look for trycloudflare.com URL pattern
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !detectedUrl) {
        detectedUrl = match[0];
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('   CLOUDFLARE PUBLIC HTTPS TUNNEL ACTIVE');
        console.log('   Public URL: ' + detectedUrl);
        console.log('   Students / Vercel can now access: ' + detectedUrl + '/api');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Automatically store URL in Supabase
        await updateSupabaseTunnelUrl(detectedUrl);
      }
    };

    tunnelProcess.stdout.on('data', handleOutput);
    tunnelProcess.stderr.on('data', handleOutput);

    tunnelProcess.on('error', (err) => {
      console.error('[Cloudflare Tunnel] Process error:', err.message);
      logger.error('[Cloudflare Tunnel] Process error:', err);
    });

    tunnelProcess.on('close', (code) => {
      console.log(`[Cloudflare Tunnel] Closed with code ${code}`);
    });

    // Handle clean termination
    process.on('SIGINT', stopTunnel);
    process.on('SIGTERM', stopTunnel);

    return true;
  } catch (error) {
    console.warn('[Cloudflare Tunnel] Warning: Could not start tunnel automatically:', error.message);
    logger.warn('[Cloudflare Tunnel] Could not start tunnel:', error);
    return false;
  }
}

function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
  }
}

module.exports = {
  startTunnel,
  stopTunnel
};
