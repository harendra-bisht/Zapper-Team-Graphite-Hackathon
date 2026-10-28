import crypto from 'crypto';

export function normalizeDomain(urlOrEmail: string): string {
  try {
    let clean = urlOrEmail.trim().toLowerCase();
    if (clean.includes('@')) {
      clean = clean.split('@')[1];
    }
    clean = clean.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
    return clean;
  } catch {
    return urlOrEmail.trim().toLowerCase();
  }
}

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((w) => {
      if (w.length <= 2) return w;
      return w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1];
    })
    .join(' ');
}

export function maskIdentifier(id?: string | null): string | null {
  if (!id || id.trim().length === 0) return null;
  const clean = id.trim();
  if (clean.length <= 3) return '***';
  return clean.slice(0, 2) + '*'.repeat(clean.length - 4) + clean.slice(-2);
}

export function canonicalHash(payload: Record<string, any>): string {
  const sortedKeys = Object.keys(payload).sort();
  const normalized: Record<string, any> = {};
  for (const k of sortedKeys) {
    normalized[k] = typeof payload[k] === 'string' ? payload[k].trim() : payload[k];
  }
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function generateCertCode(prefix = 'CS-2026'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars[crypto.randomInt(0, chars.length)];
    p2 += chars[crypto.randomInt(0, chars.length)];
  }
  return `${prefix}-${p1}-${p2}`;
}

export async function generateUniqueCertCode(db: any, prefix = 'CS-2026'): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars[crypto.randomInt(0, chars.length)];
      p2 += chars[crypto.randomInt(0, chars.length)];
    }
    const candidate = `${prefix}-${p1}-${p2}`;
    const check = await db.query('SELECT 1 FROM certificates WHERE UPPER(certificate_code) = UPPER($1)', [candidate]);
    if (check.rows.length === 0) {
      return candidate;
    }
  }
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rnd = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
}

export function hashIp(ip: string, salt = 'certishield_ip_salt'): string {
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
}
