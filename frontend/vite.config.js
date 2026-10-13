import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

const customLogger = createLogger()
const originalError = customLogger.error

customLogger.error = (msg, options) => {
  // Ignore benign socket aborts/resets when client reloads or closes tab
  if (
    options?.error?.code === 'ECONNABORTED' ||
    options?.error?.code === 'ECONNRESET' ||
    options?.error?.code === 'EPIPE' ||
    (typeof msg === 'string' && msg.includes('ECONNABORTED'))
  ) {
    return
  }
  originalError(msg, options)
}

// https://vitejs.dev/config/
export default defineConfig({
  customLogger,
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  }
})

