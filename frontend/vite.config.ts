import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// في وقت التطوير: أي طلب بيبدأ بـ /api بيتحوّل للسيرفر على Railway.
// كده المتصفح يشوف كل حاجة من نفس العنوان (localhost) ومفيش مشاكل CORS ولا كوكيز.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'https://store-production-2d6a.up.railway.app'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // كوكي الـ refresh token بييجي من السيرفر بـ Secure و Path=/auth.
          // على localhost بنعدّلهم عشان المتصفح يقبله ويبعته مع طلبات /api/auth/*
          configure: (proxy) => {
            proxy.on('proxyRes', (res) => {
              const cookies = res.headers['set-cookie']
              if (!cookies) return
              res.headers['set-cookie'] = cookies.map((c) =>
                c
                  .replace(/;\s*secure/i, '')
                  .replace(/;\s*samesite=none/i, '; SameSite=Lax')
                  .replace(/;\s*path=\/auth/i, '; Path=/api/auth'),
              )
            })
          },
        },
      },
    },
  }
})
