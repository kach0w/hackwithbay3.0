import { butterbase, butterbaseConfigured } from './butterbase'

export async function getCurrentUser() {
  if (!butterbaseConfigured || !butterbase) return null
  const { data, error } = await butterbase.auth.getUser()
  if (error) return null
  const user = data?.user ?? data
  return user?.id ? user : null
}

export async function signInOrUp({ email, password, mode }) {
  if (!butterbaseConfigured || !butterbase) {
    throw new Error('Butterbase not configured')
  }

  const isSignIn = mode === 'signin' || mode === 'login'

  if (!isSignIn) {
    const { error: signUpError } = await butterbase.auth.signUp({ email, password })
    if (signUpError) throw new Error(signUpError.message)
  }

  const { data, error: signInError } = await butterbase.auth.signIn({ email, password })
  if (signInError) {
    if (!isSignIn) {
      throw new Error('Account created. Sign in with your password — check email if verification is required.')
    }
    throw new Error(signInError.message)
  }

  if (data?.user?.id) return data.user

  const user = await getCurrentUser()
  if (!user?.id) throw new Error('Could not load Butterbase user')
  return user
}
