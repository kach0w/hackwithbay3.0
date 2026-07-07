export function isLocalDemo() {
  if (import.meta.env.VITE_LOCAL_DEMO === 'false') return false
  if (import.meta.env.VITE_LOCAL_DEMO === 'true') return true
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}
