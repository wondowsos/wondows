import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pinataJwt = env.PINATA_JWT?.trim() || ''

  const pumpdevProxy = {
    '/api/pumpdev': {
      target: 'https://pumpdev.io',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/pumpdev/, ''),
    },
  }

  const pinataProxy = {
    '/api/pinata': {
      target: 'https://uploads.pinata.cloud',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/pinata/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.removeHeader('authorization')
          if (pinataJwt) {
            proxyReq.setHeader('Authorization', `Bearer ${pinataJwt}`)
          }
        })
      },
    },
  }

  const proxy = { ...pinataProxy, ...pumpdevProxy }

  return {
    plugins: [react()],
    server: {
      host: true, // listen on 0.0.0.0 so LAN can open http://<your-ip>:5173
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
