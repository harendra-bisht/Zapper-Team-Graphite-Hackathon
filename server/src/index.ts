import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import institutionRoutes from './routes/institution';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import { getDatabase } from './database/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Rate Limiting on Verification and Auth endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Rate limit exceeded: Max 60 requests per minute.' },
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/public', apiLimiter, publicRoutes);
app.use('/api/admin', adminRoutes);

import path from 'path';
import { getLanIp } from './utils/lanIp';

// Serve frontend static build if dist exists
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.query('SELECT 1 as healthy');
    const lanIp = getLanIp();
    res.json({
      status: 'healthy',
      database: db.isPostgres ? 'PostgreSQL' : 'SQLite (Local Engine)',
      network_ip: lanIp,
      port: PORT,
      lan_url: `http://${lanIp}:${PORT}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Fallback all other GET requests to frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    const lanIp = getLanIp();
    console.log(`====================================================`);
    console.log(` CertiShield Backend Server running on port ${PORT}`);
    console.log(` Local:   http://localhost:${PORT}`);
    console.log(` Network: http://${lanIp}:${PORT}`);
    console.log(` Health:  http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
    try {
      await getDatabase();
    } catch (err: any) {
      console.error('Initial database warning:', err.message);
    }
  });
}

export default app;
