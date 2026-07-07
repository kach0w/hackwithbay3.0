// Verifies flattenGraph() produces the Contract-1 shape with human-readable,
// inference-matchable node ids — without needing a live Neo4j. Run:
//   node backend/test/flatten.test.mjs
import assert from 'node:assert/strict'
import { flattenGraph } from '../lib/graph-shape.js'

// --- fake neo4j records ------------------------------------------------------
// Mirrors the driver's node/relationship objects closely enough for the
// transform: nodes have { elementId, labels, properties }, rels have
// { elementId, type, properties }.
const node = (elementId, label, properties) => ({ elementId, labels: [label], properties })
const rel = (elementId, type, properties = {}) => ({ elementId, type, properties })
const record = (n, r, m) => ({ get: (k) => ({ n, r, m }[k]) })

const frank = node('e:1', 'Person', { name: 'Frank' })
const auth = node('e:2', 'Component', { name: 'auth-service' })
const user = node('e:3', 'Component', { name: 'user-service' })
const dPg = node('e:4', 'Decision', { id: 'd_pg', text: 'Use Postgres for user-service', deprecated: true, ts: '2026-07-07T09:20:00Z' })

const records = [
  record(frank, rel('r:1', 'OWNS'), auth),          // Frank -[:OWNS]-> auth-service
  record(auth, rel('r:2', 'DEPENDS_ON'), user),     // auth-service -[:DEPENDS_ON]-> user-service
  record(dPg, rel('r:3', 'ABOUT', { deprecated: true }), user), // d_pg -[:ABOUT]-> user-service
  record(user, null, null),                          // user-service with no outgoing rel
  record(frank, rel('r:1', 'OWNS'), auth),          // duplicate row -> must NOT duplicate nodes/edges
]

const { nodes, edges } = flattenGraph(records)
const byId = Object.fromEntries(nodes.map(n => [n.id, n]))

// 1. Person/Component ids are the human-readable name (the B2 fix), not elementId.
assert.ok(byId['Frank'], 'Person node id should be "Frank"')
assert.equal(byId['Frank'].type, 'Person')
assert.ok(byId['auth-service'], 'Component node id should be "auth-service"')
assert.ok(byId['user-service'], 'Component node id should be "user-service"')

// 2. Decision keeps its explicit id and deprecated flag + stringified ts.
assert.ok(byId['d_pg'], 'Decision node id should be "d_pg"')
assert.equal(byId['d_pg'].deprecated, true)
assert.equal(typeof byId['d_pg'].ts, 'string')
assert.equal(byId['d_pg'].label, 'Use Postgres for user-service')

// 3. Edges reference nodes by those same ids (so inference highlight matches).
const owns = edges.find(e => e.type === 'OWNS')
assert.deepEqual([owns.source, owns.target], ['Frank', 'auth-service'])
const depends = edges.find(e => e.type === 'DEPENDS_ON')
assert.deepEqual([depends.source, depends.target], ['auth-service', 'user-service'])

// 4. No duplication from the repeated record.
assert.equal(nodes.length, 4, `expected 4 unique nodes, got ${nodes.length}`)
assert.equal(edges.length, 3, `expected 3 unique edges, got ${edges.length}`)

// 5. The inference-highlight contract: names returned by inferAffected() are
//    valid node ids in the graph (this is exactly what was broken before B2).
for (const name of ['Frank', 'auth-service', 'user-service']) {
  assert.ok(byId[name], `inference name "${name}" must be a node id`)
}

console.log('PASS: flattenGraph produces Contract-1 shape with matchable ids (4 nodes, 3 edges)')
