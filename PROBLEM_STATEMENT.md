# HackwithBay 3.0 — Official Problem Statement

**Theme:** Building Graph-Aware Agentic Applications with Butterbase, Neo4j, and RocketRide Cloud

The next generation of AI applications isn't just conversational — it understands relationships. Agents that reason over connected data, run production-grade pipelines in the cloud, and ship with zero DevOps overhead. HackwithBay 3.0 challenges you to combine a graph database, a managed AI pipeline runtime, and an AI-native backend to build agentic applications that model the real, messy, interconnected world — and to optionally use Daytona to give your agents their own sandboxed compute to work in, and Cognee to give your agents their own AI memory.

---

## Core Challenge

Design and build an innovative agentic application that:

- **Butterbase:** Provides the backend — database, auth, storage, and AI model gateway — with zero DevOps.
- **Neo4j:** Models your domain as a graph, so your agent can traverse relationships, run graph algorithms, and reason over connected entities instead of flat rows.
- **RocketRide Cloud:** Hosts and runs your AI pipelines and multi-agent workflows in production, with full observability, without you managing any infrastructure.
- **Daytona (optional):** Gives your agent its own isolated, stateful sandbox to write, execute, and iterate on code autonomously.
- **Cognee (optional):** Gives your agent its own AI Memory

---

## Mandatory Requirements

- **Butterbase Integration:** Build and deploy your product backend on Butterbase — database, auth, and payment must all be in active use.
- **Neo4j Integration:** Model at least one core part of your domain as a property graph in Neo4j, and your agent must actively query or traverse it (Cypher queries, graph algorithms, or relationship-based retrieval) — not just use it as a glorified key-value store.
- **RocketRide Cloud Deployment:** Build your pipeline/workflow and deploy it to RocketRide Cloud (not just local/Docker) so it's running as a managed, production endpoint your app calls.
- **Daytona (Optional Bonus):** Projects that give their agent a live Daytona sandbox — to execute generated code, run tests, or perform multi-step build tasks autonomously — are eligible for a bonus prize track.
- **Cognee (Optional Bonus):** Projects that give their agent AI memory — to remember, recall (optionally to improve & forget) — are eligible for a bonus prize.
- **Deep Integration:** All three mandatory technologies must be meaningfully woven into the core product experience — bolting one on as an afterthought is grounds for disqualification.

---

## Technology Primers

### 🧈 Butterbase — Backend for AI Builders

An AI-optimized Backend-as-a-Service that automates database provisioning, auth, APIs, and file storage. Includes an AI model gateway for unified access to GPT, Claude, and Gemini, so you're not managing separate API keys and rate limits per provider.

### 🕸️ Neo4j — The Native Graph Database

Neo4j stores data as nodes and relationships instead of tables, making it a natural fit for anything relational-at-heart: social graphs, org charts, fraud rings, recommendation engines, knowledge graphs, dependency trees, and supply chains. Query with Cypher, run built-in graph algorithms (shortest path, centrality, community detection), and let your agent traverse connections a SQL join could never express cleanly.

### 🚀 RocketRide Cloud — Managed AI Pipeline Runtime

RocketRide is an open-source AI pipeline builder with a high-performance C++ core, built visually in VS Code and backed by 13+ LLM providers, 8+ vector databases, and multi-agent orchestration support. Pipelines are portable JSON — build them locally, then one-click deploy to [RocketRide Cloud](https://cloud.rocketride.ai/) for managed hosting, so your pipeline runs the same way in production as it did on your laptop, with no infrastructure to babysit.

### 📦 Daytona (Optional) — Sandboxes for Agents

Daytona provides secure, stateful sandboxes — full composable computers with their own filesystem and kernel — where an AI agent can install dependencies, write files, run and test code, and pick right back up where it left off in a later session. Ideal for any project where your agent needs to do something computational, not just talk about it: generate and run code, process data, or complete multi-step build tasks autonomously.

### 🧠 Cognee (Optional) — AI Brain for Agents

Capture context, and/or upload documents and let Cognee turn it all into an AI Brain. Then access your Brain from your agents, applications and users across multiple sessions. For this hackathon, use Cognee Open Source.

---

## Suggested Problem Tracks

| Track | Problem | Solution Summary |
|---|---|---|
| **1. Codebase Knowledge Graph Agent** | Engineers can't see how a change ripples through a large codebase. | Neo4j: Models files, functions, and dependencies as a graph. RocketRide Cloud: Runs the static-analysis/ingestion pipeline. Butterbase: Stores user sessions and query history. Daytona: Spins up a sandbox to actually run and verify suggested refactors. |
| **2. Fraud & Anomaly Ring Detector** | Fraud rings hide inside transactions that look fine in isolation. | Neo4j: Graph of accounts, devices, and transactions; runs community detection to surface rings. RocketRide Cloud: Streaming pipeline to score and flag events. Butterbase: Case management backend and auth for investigators. |
| **3. Personalized Learning Path Agent** | Students get generic courses that ignore what they actually know. | Neo4j: Knowledge graph of concepts and prerequisites. RocketRide Cloud: Adaptive-questioning pipeline. Butterbase: Stores learner progress and profiles. Daytona: Sandbox for auto-graded coding exercises. |
| **4. Enterprise Org & Expertise Finder** | "Who actually knows about X?" gets lost across large orgs. | Neo4j: Graph of people, teams, projects, and skills. RocketRide Cloud: Ingestion pipeline over docs/Slack/tickets to extract expertise signals. Butterbase: Auth, profiles, and search backend. |
| **5. Supply Chain Risk Navigator** | A single supplier failure can cascade invisibly through a network. | Neo4j: Multi-tier supplier/part/facility graph with shortest-path and centrality analysis. RocketRide Cloud: Risk-scoring pipeline ingesting news and shipment data. Butterbase: Dashboards, auth, alerting backend. |
| **6. Research Citation & Idea Explorer** | Researchers lose track of how papers, authors, and ideas connect over time. | Neo4j: Citation and co-authorship graph. RocketRide Cloud: Summarization/synthesis pipeline over new papers. Butterbase: Stores saved collections and user notes. Daytona: Sandbox to run and reproduce experiments from papers. |
| **7. Recommendation Engine with Reasoning** | Black-box recommendations users don't trust or understand. | Neo4j: Product/user/interaction graph powering explainable, path-based recommendations. RocketRide Cloud: Feature and embedding pipeline. Butterbase: Catalog and user backend, AI gateway for explanation generation. |
| **8. Autonomous Incident Responder** | On-call engineers manually piece together root cause across services. | Neo4j: Service dependency graph for blast-radius and root-cause tracing. RocketRide Cloud: Anomaly-detection and correlation pipeline. Butterbase: Incident history and auth. Daytona: Sandbox where the agent reproduces and tests a fix before proposing it. |
| **9. Compliance & Contract Relationship Mapper** | Legal teams can't see how clauses, entities, and obligations interconnect across hundreds of contracts. | Neo4j: Graph of clauses, parties, and obligations extracted from contracts. RocketRide Cloud: Document ingestion/extraction pipeline. Butterbase: Secure storage, auth, and review workflow backend. |
| **10. Open Innovation Track** | Any problem where relationships matter more than rows. | Use Neo4j for the graph model of your choice, RocketRide Cloud for the AI pipeline, and Butterbase for the backend — bring your own idea. |
| **11. LLM Wiki** | An LLM Wiki is a pattern where AI incrementally builds and maintains an interconnected personal wiki from your documents. | Use Cognee and Neo4j for the knowledge graph, RocketRide Cloud for the AI pipeline, and Butterbase for the backend. |

---

## Submission & Deliverables

### What to Submit

- **Working Prototype:** Live or local demo.
- **Source Code:** Repository link.
- **Project Description:** Detail the problem, the graph model you built in Neo4j, and how Butterbase and RocketRide Cloud are integrated. Be sure to mention if you used Cognee or Daytona (both optional).
- **Pitch Deck/Video:** Optional.

### How to Submit

- **Setup:** Connect to Butterbase before starting.
- **Sign up:** [dashboard.butterbase.ai](https://dashboard.butterbase.ai/)
- **Promo Code:** `ENJOY0707` (Redeem in billing).
- **Final Submission:** Paste into your AI agent:
  > Submit my project to the hackathon. Submission code: ENJOY0707 Hackathon slug: HackwithBay-0707
- **[Instructions doc](https://docs.google.com/document/d/1lfPicUwyrbfLk2afu_vl1AmklrGArJV24ZsZiVHRJEM/edit?usp=sharing)**
- **Questions?** Ask in [#butterbase-support on Discord](https://discord.gg/MpvNBFPUk)
- **[Join our 10:15am Workshop via Zoom](https://us06web.zoom.us/j/85286202571?pwd=uvN6e5pj3NHxT8lDDb10jenZrhjxay.1)**

---

## Setup Checklist

- **Butterbase:** Sign up at the [Butterbase dashboard](https://dashboard.butterbase.ai/) and provision your project before you start building.
- **Neo4j:** Spin up an instance (Aura free tier or local) and have your schema/graph model sketched before the pipeline work begins.
- **RocketRide Cloud:** Build your pipeline locally in the RocketRide VS Code extension, then deploy it to [cloud.rocketride.ai](https://cloud.rocketride.ai/) — a local-only pipeline will not satisfy the mandatory requirement.
- **Daytona (optional):** Sign up for sandbox access if your project needs the agent to execute or test code autonomously.
- **Cognee (optional):** Download and install [Cognee Open Source](https://github.com/topoteretes/cognee#step-1-install-cognee) and configure it to work with Neo4j. For this hackathon, use Open Source Cognee.

---

## Judging

Judging will weigh how meaningfully all three mandatory technologies are woven into the core product experience — integrations that feel bolted on rather than load-bearing will be scored down.
