import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 60000, // 60s for slow requests (e.g. PDF generation)
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (proxyReq.socket) proxyReq.socket.setTimeout(60000);
          });
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.socket) proxyRes.socket.setTimeout(60000);
          });
          proxy.on('error', (err, req, res) => {
            const msg = err?.code === 'ECONNRESET' ? 'Backend connection reset (try again).' : err?.code === 'ECONNREFUSED' ? 'Backend not running.' : err?.message || 'Proxy error';
            console.warn(`[vite proxy] ${req?.url || ''} – ${msg}`);
          });
        },
      },
    },
  },
});
