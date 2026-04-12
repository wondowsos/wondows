import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const walletApiOrigin = env.VITE_WALLET_API_ORIGIN?.trim() || ''
  const pinataJwt = env.PINATA_JWT?.trim() || ''

  const walletProxy = walletApiOrigin
    ? {
        '/api/wallet': {
          target: walletApiOrigin,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/wallet/, '/api'),
        },
        '/api/trade-local': {
          target: walletApiOrigin,
          changeOrigin: true,
        },
      }
    : {}

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

  const proxy = { ...pinataProxy, ...walletProxy }

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
