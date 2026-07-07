# Person A — Neo4j graph layer (merged on main)

Session-scoped graph (`-[:IN_SESSION]->(:Session)`), two tabs:
- **PROJECT** — Person / Component / Decision; supersede + dependency inference
- **BRAINSTORM** — Person / Skill / Domain / Overlap; live profile ingestion

## On main now
- Aura env: `NEO4J_USERNAME`, `NEO4J_DATABASE`
- `normalizeComponent()` — maps extractor output to canonical components
- Session-scoped supersede (newest live decision only)
- `inferAffected` returns node ids for PROJECT highlights
- `seedProjectSession` / `seedBrainstormSession` + `npm run seed`
- Person ids scoped per Butterbase user: `person_{sessionId}_{userId}`

## Demo
```bash
npm run seed -- demo both    # pre-fill brainstorm + project tabs
npm run check -- demo        # smoke test Neo4j + Butterbase
```

New sessions auto-seed the PROJECT skeleton (components, OWNS, DEPENDS_ON, starter decision).
Brainstorm tab fills via live teammate onboarding.
