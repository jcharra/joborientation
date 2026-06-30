import client from './client'

export interface User {
  id: number
  name: string
  email: string | null
  role: 'admin' | 'consultant' | 'student'
  ldap_username: string | null
  consultant_profile: { about_me: string | null; profile_picture_path: string | null } | null
}

export async function loginConsultant(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await client.post('/auth/consultant/login', { email, password })
  return data
}

export async function loginStudent(username: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await client.post('/auth/student/login', { username, password })
  return data
}

export async function logout(role: 'consultant' | 'student' | 'admin'): Promise<void> {
  const endpoint = role === 'student' ? '/auth/student/logout' : '/auth/consultant/logout'
  await client.post(endpoint)
}

export async function getMe(role: 'consultant' | 'student' | 'admin'): Promise<User> {
  const endpoint = role === 'student' ? '/auth/student/me' : '/auth/consultant/me'
  const { data } = await client.get(endpoint)
  return data
}
