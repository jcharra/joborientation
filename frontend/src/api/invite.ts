import client from './client'
import type { User } from './auth'

export interface InvitePayload {
  first_name: string
  last_name: string
  email: string
  invitation_body: string
}

export async function inviteSpeaker(payload: InvitePayload): Promise<void> {
  await client.post('/admin/invite', payload)
}

export async function acceptInvitation(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}): Promise<{ token: string; user: User }> {
  const { data } = await client.post('/auth/invitation/accept', payload)
  return data
}
