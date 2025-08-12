import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Development-only middleware to serve /api/* endpoints locally
    mode === 'development' && {
      name: 'local-serverless-api',
      configureServer(server) {
        const parseJsonBody = async (req: any) => {
          return new Promise((resolve) => {
            const chunks: Uint8Array[] = [];
            req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
            req.on('end', () => {
              const raw = Buffer.concat(chunks).toString('utf-8');
              try {
                resolve(raw ? JSON.parse(raw) : {});
              } catch {
                resolve({});
              }
            });
            req.on('error', () => resolve({}));
          });
        };

        const wrapRes = (res: any) => {
          if (typeof res.status !== 'function') {
            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
          }
          if (typeof res.json !== 'function') {
            res.json = (obj: any) => {
              if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(obj));
            };
          }
          if (typeof res.send !== 'function') {
            res.send = (data: any) => {
              if (typeof data === 'object' && data !== null) {
                if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } else {
                res.end(data);
              }
            };
          }
          return res;
        };

        const mountHandler = (route: string, modulePath: string) => {
          server.middlewares.use(route, async (req: any, res: any) => {
            try {
              // Set CORS headers
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
              
              // Handle OPTIONS quickly for CORS
              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              const mod = await import(modulePath);
              if (!mod?.default) {
                res.statusCode = 500;
                res.end('Handler not found');
                return;
              }

              // Attach JSON body for POST/PUT/PATCH
              if (req.method && ['POST','PUT','PATCH'].includes(req.method)) {
                if (!req.body) {
                  req.body = await parseJsonBody(req);
                }
              }

              // Provide Express-like helpers
              const wrappedRes = wrapRes(res);
              return mod.default(req, wrappedRes);
            } catch (e: any) {
              try {
                res.statusCode = 500;
                res.end(`Local API error: ${e?.message || 'unknown error'}`);
              } catch (_) {
                // ignore
              }
            }
          });
        };

        mountHandler('/api/notion-token', path.resolve(__dirname, './api/notion-token.js'));
        mountHandler('/api/notion-search', path.resolve(__dirname, './api/notion-search.js'));
        mountHandler('/api/notion-page-details', path.resolve(__dirname, './api/notion-page-details.js'));
        mountHandler('/api/notion-page-content', path.resolve(__dirname, './api/notion-page-content.js'));
        mountHandler('/api/notion-block-children', path.resolve(__dirname, './api/notion-block-children.js'));
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
