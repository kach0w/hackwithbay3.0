const DEV_USER_KEY = 'hivemind_dev_user_id'

export function memberStorageKey(sessionId) {
  return `hivemind_member_${sessionId}`
}

export function loadMember(sessionId) {
  try {
    const raw = sessionStorage.getItem(memberStorageKey(sessionId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveMember(sessionId, member) {
  sessionStorage.setItem(memberStorageKey(sessionId), JSON.stringify(member))
}

export function clearMember(sessionId) {
  sessionStorage.removeItem(memberStorageKey(sessionId))
}

export function getOrCreateDevUserId() {
  let id = localStorage.getItem(DEV_USER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEV_USER_KEY, id)
  }
  return id
}
