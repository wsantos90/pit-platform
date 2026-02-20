/**
 * VPS Cookie Service — Microserviço de renovação de cookies Akamai
 * Roda na VPS com Express + Puppeteer
 *
 * Ref: FC09 — Akamai Cookie Renewal
 *
 * Setup: npm install && npm start
 * Docker: docker build -t pit-cookie-service . && docker run -p 3001:3001 pit-cookie-service
 */

// TODO: Implementar Express server com os endpoints:
// POST /renew — Renovar cookie Akamai via Puppeteer
// GET  /health — Health check

// import express from 'express';
// import { renewCookie } from './puppeteer';

// const app = express();
// const PORT = process.env.PORT || 3001;
// const SECRET = process.env.COOKIE_SERVICE_SECRET;

// app.use(express.json());

// // Auth middleware
// app.use((req, res, next) => {
//   if (req.headers['x-secret'] !== SECRET) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }
//   next();
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// app.post('/renew', async (req, res) => {
//   try {
//     const cookie = await renewCookie();
//     res.json({ cookie, renewed_at: new Date().toISOString() });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to renew cookie' });
//   }
// });

// app.listen(PORT, () => console.log(`Cookie service running on :${PORT}`));

console.log('TODO: Implementar cookie service');
