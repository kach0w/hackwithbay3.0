import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import graphRouter from './routes/graph.js'
import eventRouter from './routes/event.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/graph', graphRouter)
app.use('/event', eventRouter)
app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.listen(process.env.PORT || 3001, () => console.log('Hivemind backend ready'))
