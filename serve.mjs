// Must be imported first for Sentry instrumentation
import './instrument.server.mjs'

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import app from './dist/server/server.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const clientDir = join(__dirname, 'dist/client')
const port = Number(process.env.PORT || 3000)

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url ?? '/'
    const filePath = join(clientDir, url.split('?')[0])

    // Serve static files from dist/client
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const contentType = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
      const isHashedAsset = url.startsWith('/assets/')
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': isHashedAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0',
      })
      createReadStream(filePath).pipe(res)
      return
    }

    // Pass everything else to the TanStack Start SSR handler
    const protocol = req.headers['x-forwarded-proto']?.split(',')[0].trim() ?? 'http'
    const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost'
    const fullUrl = new URL(url, `${protocol}://${host}`)

    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v)
      } else {
        headers.set(key, value)
      }
    }

    const method = req.method ?? 'GET'
    const hasBody = method !== 'GET' && method !== 'HEAD'

    const request = new Request(fullUrl, {
      method,
      headers,
      body: hasBody ? Readable.toWeb(req) : null,
      ...(hasBody ? { duplex: 'half' } : {}),
    })

    const response = await app.fetch(request)

    // Build response headers (handle multi-value set-cookie)
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders['set-cookie'] = [
          ...(Array.isArray(responseHeaders['set-cookie'])
            ? responseHeaders['set-cookie']
            : responseHeaders['set-cookie']
              ? [responseHeaders['set-cookie']]
              : []),
          value,
        ]
      } else {
        responseHeaders[key] = value
      }
    })

    res.writeHead(response.status, responseHeaders)

    if (response.body) {
      for await (const chunk of response.body) {
        if (!res.writableEnded) res.write(chunk)
      }
    }

    res.end()
  } catch (err) {
    console.error('Server error:', err)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`)
})
