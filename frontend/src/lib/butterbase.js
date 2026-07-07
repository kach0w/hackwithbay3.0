import { createClient } from '@butterbase/sdk'

const appId = import.meta.env.VITE_BUTTERBASE_APP_ID
const apiUrl = import.meta.env.VITE_BUTTERBASE_API_URL || 'https://api.butterbase.ai'
const anonKey = import.meta.env.VITE_BUTTERBASE_ANON_KEY

export const butterbaseConfigured = Boolean(appId)

export const butterbase = butterbaseConfigured
  ? createClient({ appId, apiUrl, ...(anonKey ? { anonKey } : {}) })
  : null
