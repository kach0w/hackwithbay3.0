import { useEffect } from 'react'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'

export function useRealtime(onUpdate) {
  useEffect(() => {
    const pollId = setInterval(() => {
      Promise.resolve(onUpdate()).catch(err => {
        console.warn('[realtime] poll update failed:', err.message)
      })
    }, 4000)

    if (!butterbaseConfigured || !butterbase?.realtime) {
      return () => clearInterval(pollId)
    }

    let sub = null
    try {
      butterbase.realtime.connect()
      sub = butterbase.realtime.on('graph_events', () => {
        Promise.resolve(onUpdate()).catch(err => {
          console.warn('[realtime] push update failed:', err.message)
        })
      })
    } catch (err) {
      console.warn('[realtime] subscription failed:', err.message)
    }

    return () => {
      clearInterval(pollId)
      try {
        sub?.unsubscribe?.()
        butterbase.realtime.disconnect()
      } catch {
        // ignore cleanup errors
      }
    }
  }, [onUpdate])
}
