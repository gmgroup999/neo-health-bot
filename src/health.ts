import http from 'http';
import { getAllSessions } from './tracker';
import { logger } from './logger';

const PORT = parseInt(process.env.HEALTH_PORT ?? '3000', 10);

export function startHealthServer(): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/healthz' && req.method === 'GET') {
      const sessions = getAllSessions().length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        sessions,
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    logger.info(`Health endpoint: http://localhost:${PORT}/healthz`);
  });

  server.on('error', (err) => {
    logger.error('Health server error', err);
  });
}
