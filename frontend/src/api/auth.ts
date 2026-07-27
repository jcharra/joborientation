import client from './client'

export interface User {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: 'admin' | 'consultant' | 'student'
  ldap_username: string | null
  class: string | null
  email_verified_at: string | null
  last_login_at: string | null
  consultant_profile: { about_me: string | null; profile_picture_path: string | null; profile_picture_url: string | null; language: string | null } | null
}

export async function loginConsultant(identifier: string, password: string, useLdap: boolean): Promise<{ token: string; user: User }> {
  const payload = useLdap ? { username: identifier, password } : { email: identifier, password }
  const { data } = await client.post('/auth/consultant/login', payload)
  return data
}

export async function loginStudent(identifier: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await client.post('/auth/student/login', { username: identifier, password })
  return data
}

export async function loginAdmin(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await client.post('/auth/admin/login', { email, password })
  return data
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  role: 'consultant',
): Promise<void> {
  await client.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
    role,
  })
}

export async function verifyEmail(
  id: string,
  hash: string,
  expires: string,
  signature: string,
): Promise<{ token: string; user: User }> {
  const { data } = await client.get(`/auth/email/verify/${id}/${hash}`, {
    params: { expires, signature },
  })
  return data
}

export async function resendVerification(email: string): Promise<void> {
  await client.post('/auth/email/resend', { email })
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post('/auth/consultant/forgot-password', { email })
}

export async function logout(role: 'consultant' | 'student' | 'admin'): Promise<void> {
  const endpoint = role === 'student' ? '/auth/student/logout' : role === 'admin' ? '/auth/admin/logout' : '/auth/consultant/logout'
  await client.post(endpoint)
}

export async function getMe(role: 'consultant' | 'student' | 'admin'): Promise<User> {
  const endpoint = role === 'student' ? '/auth/student/me' : role === 'admin' ? '/auth/admin/me' : '/auth/consultant/me'
  const { data } = await client.get(endpoint)
  return data
}
