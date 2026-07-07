import { useEffect } from 'react'

// Swap the body of this hook with actual Butterbase client once you have credentials.
// Fallback: polls every 2s (section 9 fallback ladder — looks identical on stage).

export function useRealtime(onUpdate) {
  useEffect(() => {
    // TODO: replace with Butterbase channel subscription
    // const channel = bb.channel('project:default')
    // channel.on('graph_update', onUpdate).subscribe()
    // return () => channel.unsubscribe()

    // Polling fallback
    const id = setInterval(onUpdate, 2000)
    return () => clearInterval(id)
  }, [onUpdate])
}
