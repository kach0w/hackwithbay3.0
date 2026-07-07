import { useEffect, useState } from 'react'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'

export function useRealtime(onUpdate) {
  useEffect(() => {
    if (!butterbaseConfigured || !butterbase) {
      const id = setInterval(onUpdate, 2000)
      return () => clearInterval(id)
    }

    butterbase.realtime.connect()

    const sub = butterbase.realtime.on('graph_events', () => {
      onUpdate()
    })

    return () => {
      sub.unsubscribe()
      butterbase.realtime.disconnect()
    }
  }, [onUpdate])
}
