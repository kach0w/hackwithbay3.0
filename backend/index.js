import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import graphRouter from './routes/graph.js'
import eventRouter from './routes/event.js'
import sessionRouter from './routes/session.js'
import joinRouter from './routes/join.js'
import { checkConnection, isConfigured } from './lib/butterbase.js'
import { checkConnection as checkRocketRide } from './lib/rocketride.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/session', sessionRouter)
app.use('/session', joinRouter)
app.use('/graph', graphRouter)
app.use('/event', eventRouter)
app.get('/health', async (_, res) => {
  const butterbase = isConfigured() ? await checkConnection() : { ok: false, error: 'not configured' }
  const rocketride = await checkRocketRide()
  res.json({ status: 'ok', butterbase, rocketride })
})

app.listen(process.env.PORT || 3001, () => console.log('Hivemind backend ready'))
