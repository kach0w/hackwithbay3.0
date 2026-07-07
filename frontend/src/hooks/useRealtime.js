import { useEffect } from 'react'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'

export function useRealtime(onUpdate) {
  useEffect(() => {
    // Fallback ladder: always poll so sync works even if Butterbase WS is down.
    const pollId = setInterval(onUpdate, 2000)

    if (!butterbaseConfigured || !butterbase) {
      return () => clearInterval(pollId)
    }

    butterbase.realtime.connect()

    const sub = butterbase.realtime.on('graph_events', () => {
      onUpdate()
    })

    return () => {
      clearInterval(pollId)
      sub.unsubscribe()
      butterbase.realtime.disconnect()
    }
  }, [onUpdate])
}
