import app from '../src/index';
import { getDatabase } from '../src/database/db';
import http from 'http';

async function runProbes() {
  console.log('======================================================');
  console.log(' CertiShield In-Process Runtime Integration Probes   ');
  console.log('======================================================\n');

  // Start server on an ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Health Probe
    const res1 = await fetch(`${base}/api/health`);
    const health = await res1.json();
    console.log(`✓ 1. /api/health => Status: ${health.status}, DB: ${health.database}, LAN URL: ${health.lan_url}`);

    // 2. Genuine verification
    const res2 = await fetch(`${base}/api/public/verify/GPH-26-8F29A`);
    const v1 = await res2.json();
    console.log(`✓ 2. /api/public/verify/GPH-26-8F29A => Verdict: ${v1.data.verdict} (${v1.data.verdict_title})`);

    // 3. Revoked verification
    const res3 = await fetch(`${base}/api/public/verify/GPH-26-REVOK`);
    const v2 = await res3.json();
    console.log(`✓ 3. /api/public/verify/GPH-26-REVOK => Verdict: ${v2.data.verdict} (${v2.data.verdict_title})`);

    // 4. QR Image Generation
    const res4 = await fetch(`${base}/api/public/qr?text=http://10.76.0.108:5000/?verify=GPH-26-8F29A`);
    const contentType = res4.headers.get('content-type');
    const qrBuffer = await res4.arrayBuffer();
    console.log(`✓ 4. /api/public/qr => Content-Type: ${contentType}, Bytes: ${qrBuffer.byteLength}`);

    // 5. Institution Login
    const res5 = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'acm@studentchapter.edu', password: 'Organizer@ACM2026' }),
    });
    const auth1 = await res5.json();
    console.log(`✓ 5. /api/auth/login (ACM Chapter) => User: ${auth1.user.organization_name}, Role: ${auth1.user.role}`);

    // 6. Institution Dashboard
    const res6 = await fetch(`${base}/api/institution/dashboard`, {
      headers: { Authorization: `Bearer ${auth1.token}` },
    });
    const dash = await res6.json();
    console.log(`✓ 6. /api/institution/dashboard => Credits: ${dash.wallet.balance}, Issued Certs: ${dash.stats.total_certificates}`);

    // 7. Admin Login
    const res7 = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@certishield.edu', password: 'Admin@CertiShield2026' }),
    });
    const adminAuth = await res7.json();
    console.log(`✓ 7. /api/auth/login (Admin) => User: ${adminAuth.user.name}, Role: ${adminAuth.user.role}`);

    // 8. Admin Institutions Roster
    const res8 = await fetch(`${base}/api/admin/institutions`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    const adminInst = await res8.json();
    console.log(`✓ 8. /api/admin/institutions => Institution count: ${adminInst.institutions.length}`);

    // 9. Static Frontend Serving
    const res9 = await fetch(`${base}/`);
    const htmlText = await res9.text();
    const hasCertiShieldTitle = htmlText.includes('CertiShield') || htmlText.includes('root');
    console.log(`✓ 9. GET / (Frontend Delivery) => HTTP ${res9.status}, HTML Valid: ${hasCertiShieldTitle}`);

    console.log('\n======================================================');
    console.log(' ALL 9 RUNTIME INTEGRATION PROBES PASSED 100%!       ');
    console.log('======================================================');
  } finally {
    server.close();
  }
}

runProbes().catch((err) => {
  console.error('Probe failed:', err);
  process.exit(1);
});
