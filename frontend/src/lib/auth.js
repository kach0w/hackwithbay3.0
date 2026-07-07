import { butterbase, butterbaseConfigured } from './butterbase'

export async function getCurrentUser() {
  if (!butterbaseConfigured || !butterbase) return null
  const { data } = await butterbase.auth.getUser()
  return data?.user ?? null
}

export async function signInOrUp({ email, password, mode }) {
  if (!butterbaseConfigured || !butterbase) {
    throw new Error('Butterbase not configured')
  }

  if (mode === 'signin' || mode === 'login') {
    const { error } = await butterbase.auth.signIn({ email, password })
    if (error) throw new Error(error.message)
  } else {
    const { error: signUpError } = await butterbase.auth.signUp({ email, password })
    if (signUpError) throw new Error(signUpError.message)
    const { error: signInError } = await butterbase.auth.signIn({ email, password })
    if (signInError) throw new Error(signInError.message)
  }

  const user = await getCurrentUser()
  if (!user?.id) throw new Error('Could not load Butterbase user')
  return user
}
