// Pure transform: Neo4j records (from `MATCH (n) OPTIONAL MATCH (n)-[r]->(m)`)
// -> Contract 1 shape { nodes, edges }. No neo4j-driver import so it can be
// unit-tested without a live database.
//
// Node id resolution (Contract 1): decisions carry an explicit `id` property;
// Person/Component carry only `name`. We use name as the id for those so the
// inference query (which returns p.name / dep.name) and the frontend highlight
// key on the same stable, human-readable ids. elementId is the last-resort
// fallback only for nodes missing both.

function toNode(node) {
  const p = node.properties || {}
  return {
    id: p.id || p.name || node.elementId,
    type: node.labels[0],
    label: p.name || p.text || '',
    owner: p.owner || null,
    deprecated: p.deprecated || false,
    ts: p.ts != null ? p.ts.toString() : null,
  }
}

export function flattenGraph(records) {
  const nodesByElementId = {}
  const edgesByElementId = {}

  for (const rec of records) {
    const n = rec.get('n')
    if (n && !nodesByElementId[n.elementId]) {
      nodesByElementId[n.elementId] = toNode(n)
    }

    const m = rec.get('m')
    if (m && !nodesByElementId[m.elementId]) {
      nodesByElementId[m.elementId] = toNode(m)
    }

    const r = rec.get('r')
    if (r && !edgesByElementId[r.elementId]) {
      edgesByElementId[r.elementId] = {
        id: r.elementId,
        source: nodesByElementId[n.elementId]?.id,
        target: nodesByElementId[m.elementId]?.id,
        type: r.type,
        deprecated: (r.properties && r.properties.deprecated) || false,
      }
    }
  }

  return {
    nodes: Object.values(nodesByElementId),
    edges: Object.values(edgesByElementId),
  }
}
