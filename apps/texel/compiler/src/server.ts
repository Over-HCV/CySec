import Fastify from 'fastify'
import { requireUser, requireMember, HttpError } from './auth.ts'
import { compileProject, type CompileMode } from './compile.ts'
import { forward, inverse } from './synctex.ts'

const app = Fastify({
  logger: true,
  bodyLimit: 2 * 1024 * 1024
})

// El navegador llama directo al servicio; el origen se restringe por env.
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map(s => s.trim())

app.addHook('onRequest', async (req, reply) => {
  const origin = req.headers.origin
  const allowed = ORIGINS.includes('*') ? '*' : (origin && ORIGINS.includes(origin) ? origin : '')
  if (allowed) {
    reply.header('Access-Control-Allow-Origin', allowed)
    reply.header('Access-Control-Allow-Headers', 'authorization, content-type')
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  if (req.method === 'OPTIONS') reply.code(204).send()
})

app.setErrorHandler((error, _req, reply) => {
  if (error instanceof HttpError) return reply.code(error.status).send({ error: error.message })
  app.log.error(error)
  return reply.code(500).send({ error: 'error interno' })
})

app.get('/health', async () => ({ ok: true }))

app.post<{ Body: { projectId: string, mode?: string } }>('/compile', async (req) => {
  const userId = await requireUser(req)
  const { projectId, mode } = req.body
  if (!projectId) throw new HttpError(400, 'falta projectId')
  await requireMember(userId, projectId, 'editor')
  // Un modo desconocido (o ninguno, como mandaban los clientes de antes) es una
  // compilación normal: nunca un 400 por una preferencia de la interfaz.
  const compileMode: CompileMode = mode === 'fast' ? 'fast' : 'normal'
  return compileProject(projectId, userId, compileMode)
})

app.post<{ Body: { projectId: string, compilationId: string, file: string, line: number } }>(
  '/synctex/forward',
  async (req) => {
    const userId = await requireUser(req)
    const { projectId, compilationId, file, line } = req.body
    await requireMember(userId, projectId)
    if (!compilationId) throw new HttpError(400, 'falta compilationId')
    return forward(projectId, compilationId, file, line)
  }
)

app.post<{ Body: { projectId: string, compilationId: string, page: number, x: number, y: number } }>(
  '/synctex/inverse',
  async (req) => {
    const userId = await requireUser(req)
    const { projectId, compilationId, page, x, y } = req.body
    await requireMember(userId, projectId)
    if (!compilationId) throw new HttpError(400, 'falta compilationId')
    return inverse(projectId, compilationId, page, x, y)
  }
)

const port = Number(process.env.PORT ?? 8080)
await app.listen({ port, host: '0.0.0.0' })
