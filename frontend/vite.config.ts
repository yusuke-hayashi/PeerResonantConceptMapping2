import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // LM Studio APIへのプロキシ（CORS回避）
      '/api/llm': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, ''),
        // LLMの処理が遅いため、タイムアウトを5分に延長
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, _req, _res) => {
            // タイムアウトを5分に設定
          });
        },
        timeout: 300000, // 5分
      },
    },
  },
})
