/** Stable person id within a hivemind session (one member per Butterbase user). */
export function personIdForSession(sessionId, userId) {
  return `person_${sessionId}_${userId}`
}

export function slugifyName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}
