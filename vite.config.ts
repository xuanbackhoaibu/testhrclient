import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Vite 8 minifies CSS with Lightning CSS. At its default browser target it
    // down-compiles light-dark() to a var(--lightningcss-light, …)
    // var(--lightningcss-dark, …) pair, and that polyfill only works when those
    // two custom properties are defined. Lightning CSS defines them only for a
    // :root it controls, not for our CSS Modules, so in the build they stay
    // undefined, both fallbacks collapse into one declaration
    // ("border: 1px solid #dee2e6 #373a40") and the browser drops it as
    // invalid — borders/backgrounds silently disappear in the built app while
    // `vite dev` (which does not run this minifier) looks correct. That is why
    // localhost and https rendered differently from the same commit.
    //
    // light-dark() is Baseline 2024; naming targets that support it keeps the
    // source syntax intact. Only cssTarget matters here — build.target does not
    // affect CSS, and css.lightningcss.targets does not reach the minifier.
    cssTarget: ['chrome123', 'firefox120', 'safari17.5'],
  },
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
