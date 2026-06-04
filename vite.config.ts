import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://hrm.hacomholdings.com.vn',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://hrm.hacomholdings.com.vn');
            proxyReq.setHeader('Referer', 'https://hrm.hacomholdings.com.vn/');
          });
        },
      },
    },
  },
})
