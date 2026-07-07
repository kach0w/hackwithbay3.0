// Run this in Neo4j Browser or via `cypher-shell` before the demo
// Reset: MATCH (n) DETACH DELETE n

// People
CREATE (shreeya:Person {name:'Shreeya'}),
       (frank:Person   {name:'Frank'}),
       (ryan:Person    {name:'Ryan'}),
       (priya:Person   {name:'Priya'});

// Components
CREATE (front:Component {name:'frontend'}),
       (auth:Component  {name:'auth-service'}),
       (user:Component  {name:'user-service'}),
       (match:Component {name:'matching-engine'}),
       (pay:Component   {name:'payments'}),
       (notif:Component {name:'notifications'});

// Ownership
MATCH (shreeya:Person {name:'Shreeya'}), (user:Component  {name:'user-service'})    CREATE (shreeya)-[:OWNS]->(user);
MATCH (frank:Person   {name:'Frank'}),   (auth:Component  {name:'auth-service'})    CREATE (frank)-[:OWNS]->(auth);
MATCH (ryan:Person    {name:'Ryan'}),    (match:Component {name:'matching-engine'}) CREATE (ryan)-[:OWNS]->(match);
MATCH (priya:Person   {name:'Priya'}),   (pay:Component   {name:'payments'})        CREATE (priya)-[:OWNS]->(pay);

// Dependencies — everything depends on user-service so inference fans wide
MATCH (front:Component {name:'frontend'}),        (auth:Component {name:'auth-service'})    CREATE (front)-[:DEPENDS_ON]->(auth);
MATCH (front:Component {name:'frontend'}),        (user:Component {name:'user-service'})    CREATE (front)-[:DEPENDS_ON]->(user);
MATCH (auth:Component  {name:'auth-service'}),    (user:Component {name:'user-service'})    CREATE (auth)-[:DEPENDS_ON]->(user);
MATCH (match:Component {name:'matching-engine'}), (user:Component {name:'user-service'})    CREATE (match)-[:DEPENDS_ON]->(user);
MATCH (pay:Component   {name:'payments'}),        (user:Component {name:'user-service'})    CREATE (pay)-[:DEPENDS_ON]->(user);
MATCH (notif:Component {name:'notifications'}),   (user:Component {name:'user-service'})    CREATE (notif)-[:DEPENDS_ON]->(user);

// Seed decisions (d_pg is the one you supersede live in the demo)
MATCH (user:Component {name:'user-service'})
CREATE (d_pg:Decision {id:'d_pg', text:'Use Postgres for user-service', ts:datetime()-duration('PT2H'), deprecated:false})
CREATE (d_pg)-[:ABOUT]->(user);

MATCH (front:Component {name:'frontend'})
CREATE (d_react:Decision {id:'d_react', text:'Use React for frontend', ts:datetime()-duration('PT3H'), deprecated:false})
CREATE (d_react)-[:ABOUT]->(front);

MATCH (pay:Component {name:'payments'})
CREATE (d_stripe:Decision {id:'d_stripe', text:'Use Stripe for payments', ts:datetime()-duration('PT1H'), deprecated:false})
CREATE (d_stripe)-[:ABOUT]->(pay);

MATCH (auth:Component {name:'auth-service'})
CREATE (d_jwt:Decision {id:'d_jwt', text:'JWT for auth tokens', ts:datetime()-duration('PT4H'), deprecated:false})
CREATE (d_jwt)-[:ABOUT]->(auth);

// Wire decisions to authors
MATCH (shreeya:Person {name:'Shreeya'}), (d_pg:Decision    {id:'d_pg'})     CREATE (shreeya)-[:MADE]->(d_pg);
MATCH (frank:Person   {name:'Frank'}),   (d_jwt:Decision   {id:'d_jwt'})    CREATE (frank)-[:MADE]->(d_jwt);
MATCH (priya:Person   {name:'Priya'}),   (d_stripe:Decision{id:'d_stripe'}) CREATE (priya)-[:MADE]->(d_stripe);
MATCH (ryan:Person    {name:'Ryan'}),    (d_react:Decision {id:'d_react'})  CREATE (ryan)-[:MADE]->(d_react);
