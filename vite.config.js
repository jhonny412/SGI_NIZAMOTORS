import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { config as loadEnv } from 'dotenv'

// Carga DATABASE_URL y otras variables server-side de .env.local
// VITE_* ya las carga Vite automáticamente para el cliente
loadEnv({ path: '.env.local' })

/**
 * Plugin local de API: intercepta peticiones a /api durante `npm run dev`
 * y las delega directamente al mismo handler de netlify/functions/api.js.
 * Así el comportamiento local es idéntico al de producción en Netlify.
 * En producción (build), este plugin no se incluye.
 */
function localApiPlugin() {
  return {
    name: 'local-api-server',
    configureServer(server) {
      // Iniciamos la importación del handler en paralelo al arranque de Vite
      const handlerPromise = import('./netlify/functions/api.js')
        .then((m) => m.handler)
        .catch((err) => {
          console.error('[Local API] Error al cargar handler de Netlify:', err.message)
          return null
        })

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()

        const handler = await handlerPromise
        if (!handler) {
          res.statusCode = 503
          return res.end(JSON.stringify({ status: 'error', message: 'Handler no disponible' }))
        }

        // Leer body del request
        let body = ''
        for await (const chunk of req) body += chunk

        // Construir el objeto `event` compatible con el formato de Netlify Functions
        const baseUrl = 'http://localhost'
        const fullUrl = new URL(req.url, baseUrl)
        const queryStringParameters = {}
        fullUrl.searchParams.forEach((v, k) => { queryStringParameters[k] = v })

        const event = {
          httpMethod: req.method.toUpperCase(),
          path: fullUrl.pathname,
          queryStringParameters,
          headers: req.headers,
          body: body || null,
          isBase64Encoded: false
        }

        try {
          const result = await handler(event, {})
          Object.entries(result.headers || {}).forEach(([k, v]) => res.setHeader(k, v))
          res.statusCode = result.statusCode || 200
          res.end(result.body || '')
        } catch (err) {
          console.error('[Local API] Error en handler:', err.message)
          res.statusCode = 500
          res.end(JSON.stringify({ status: 'error', message: err.message }))
        }
      })
    }
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Solo activo en modo desarrollo (npm run dev), no en build de producción
    ...(command === 'serve' ? [localApiPlugin()] : [])
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/setup.js', 'scripts/']
    }
  }
}))
