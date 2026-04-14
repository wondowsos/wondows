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
      ws: true,
      rewrite: (p) => p.replace(/^\/api\/pumpdev/, ''),
    },
  }

  /** Same-origin paths if the client base is wrong (e.g. env `/` → empty + `/api/create`). */
  const pumpdevRestProxy = Object.fromEntries(
    [
      '/api/create',
      '/api/wallet',
      '/api/claim-account',
      '/api/claim-cashback',
      '/api/transfer',
    ].map((prefix) => [
      prefix,
      { target: 'https://pumpdev.io', changeOrigin: true },
    ]),
  )

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

  const proxy = { ...pinataProxy, ...pumpdevRestProxy, ...pumpdevProxy }

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
