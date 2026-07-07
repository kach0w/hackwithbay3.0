# CaseGraph — AI Detective

Paste a news article. Watch the AI build a detective's bulletin board. Ask questions. Follow the red string.

## Stack
- **Butterbase** — auth, storage, AI gateway
- **Neo4j** — knowledge graph (entities + relationships)
- **RocketRide** — AI pipeline orchestration
- **React + Cytoscape.js** — cork board visualization

## Setup

### 1. Neo4j
Run locally via Docker:
```bash
docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# fill in your keys
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## How it works

1. Paste article → extraction agent (Claude) pulls entities + relationships with source quotes
2. Knowledge graph stored in Neo4j (Person, Org, Event, Location, Money nodes)
3. Bulletin board renders as cork board with red string connections
4. Click any node/edge to see source evidence
5. Ask detective agent questions — it reasons over the graph, cites sources

## API

- `POST /ingest` — `{ article: string }` → extracts and stores graph
- `GET /graph` — returns full graph for visualization  
- `POST /graph/query` — `{ question: string }` → detective answer
- `DELETE /graph` — clears the case board
