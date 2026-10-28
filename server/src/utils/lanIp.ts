import os from 'os';
import fs from 'fs';
import path from 'path';

export function getLanIp(): string {
  const nets = os.networkInterfaces();

  // First pass: look for Wi-Fi or Ethernet interfaces
  for (const name of Object.keys(nets)) {
    const isPreferred = /wi-fi|ethernet|en|eth|wlan/i.test(name);
    if (isPreferred) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
          return net.address;
        }
      }
    }
  }

  // Second pass: any non-internal IPv4 address
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1') {
        return net.address;
      }
    }
  }

  return '127.0.0.1';
}

export function getPublicBaseUrl(): string {
  // 1. Explicit environment variable APP_URL (e.g. deployed domain)
  const envUrl = process.env.APP_URL && process.env.APP_URL.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. Active Cloudflare / Public Tunnel URL file (auto-detected for worldwide scanning)
  try {
    const tunnelPath = path.resolve(__dirname, '../../../tunnel_url.txt');
    if (fs.existsSync(tunnelPath)) {
      const activeTunnel = fs.readFileSync(tunnelPath, 'utf8').trim();
      if (activeTunnel && activeTunnel.startsWith('http')) {
        return activeTunnel.replace(/\/+$/, '');
      }
    }
  } catch {}

  // 3. Fallback to LAN IP
  const lanIp = getLanIp();
  const port = process.env.PORT || 5000;
  return `http://${lanIp}:${port}`;
}
