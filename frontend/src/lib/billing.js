import { butterbase, butterbaseConfigured } from './butterbase'

const TEAM_PRODUCT_ID = import.meta.env.VITE_BUTTERBASE_TEAM_PRODUCT_ID

export function billingConfigured() {
  return butterbaseConfigured && Boolean(TEAM_PRODUCT_ID) && butterbase
}

export async function listTeamProducts() {
  if (!butterbase) return []
  const { data, error } = await butterbase.billing.listProducts()
  if (error) throw new Error(error.message)
  return data || []
}

export async function hasTeamPass() {
  if (!billingConfigured()) return true
  const { data, error } = await butterbase.billing.listOrders()
  if (error) throw new Error(error.message)
  return (data || []).some(o =>
    o.status === 'paid' &&
    (o.product_id === TEAM_PRODUCT_ID || o.metadata?.sku === 'team_pass')
  )
}

export async function startTeamPassCheckout() {
  if (!billingConfigured()) throw new Error('Billing not configured')
  const origin = window.location.origin
  const { data, error } = await butterbase.billing.purchase({
    productId: TEAM_PRODUCT_ID,
    successUrl: `${origin}/?purchase=success`,
    cancelUrl: `${origin}/?purchase=cancelled`
  })
  if (error) throw new Error(error.message)
  if (!data?.url) throw new Error('No checkout URL returned')
  window.location.href = data.url
}
