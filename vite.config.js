import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import chatHandler from './api/chat.js';

function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const response = {
            status(code) {
              res.statusCode = code;
              return this;
            },
            json(payload) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
            send(payload) {
              res.setHeader('Content-Type', 'application/json');
              res.end(payload);
            }
          };
          await chatHandler({ method: req.method, body }, response);
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Requête invalide : ${error.message}` }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), localApi()]
  };
});
