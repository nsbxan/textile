import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function apiDevPlugin(): Plugin {
  return {
    name: 'vite-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname.replace(/\/+$/, '') || '/api';

        // Map pathname to local api file
        const routeMap: Record<string, string> = {
          '/api': './api/index.ts',
          '/api/health': './api/health.ts',
          '/api/sheets/init': './api/sheets/init.ts',
          '/api/sheets/stats': './api/sheets/stats.ts',
          '/api/sync/events': './api/sync/events.ts',
          '/api/backup/export': './api/backup/export.ts',
          '/api/backup/import': './api/backup/import.ts',
          '/api/products': './api/products/index.ts',
          '/api/sales': './api/sales/index.ts',
        };

        const targetFile = routeMap[pathname];
        if (!targetFile) {
          return next();
        }

        try {
          // Parse request body if POST, PUT, or PATCH
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            if (bodyStr) {
              try {
                (req as any).body = JSON.parse(bodyStr);
              } catch {
                (req as any).body = bodyStr;
              }
            } else {
              (req as any).body = {};
            }
          }

          (req as any).query = Object.fromEntries(url.searchParams.entries());

          // Attach response helper methods for Vercel Serverless Function compatibility
          const extendedRes = res as any;
          extendedRes.status = (code: number) => {
            extendedRes.statusCode = code;
            return extendedRes;
          };
          extendedRes.json = (data: any) => {
            extendedRes.setHeader('Content-Type', 'application/json');
            extendedRes.end(JSON.stringify(data));
            return extendedRes;
          };

          const module = await server.ssrLoadModule(targetFile);
          if (typeof module.default === 'function') {
            await module.default(req, extendedRes);
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `No default export handler found in ${targetFile}` }));
          }
        } catch (err: any) {
          console.error(`[API DEV SERVER] Error in ${pathname}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err.message || 'Internal server error',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
          }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables from .env into process.env for local API testing
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiDevPlugin()],
    base: './',
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
