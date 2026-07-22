import client from './client'
import type { User } from './auth'

export const SALUTATION_OPTIONS = [
  'Herr',
  'Frau',
  '(ohne)',
  'Herr Dr.',
  'Frau Dr.',
  'Dr.',
  'Herr Prof. Dr.',
  'Frau Prof. Dr.',
  'Prof. Dr.',
] as const

export interface InvitePayload {
  salutation: string
  first_name: string
  last_name: string
  email: string
  invitation_body: string
}

export async function inviteSpeaker(payload: InvitePayload): Promise<void> {
  await client.post('/admin/invite', payload)
}

export interface BulkInviteSkippedRow {
  email: string
  reason: string
}

export interface BulkInviteResult {
  invited_count: number
  invited: string[]
  skipped: BulkInviteSkippedRow[]
}

export async function bulkInviteSpeakers(csv: File, invitationBody: string): Promise<BulkInviteResult> {
  const form = new FormData()
  form.append('csv', csv)
  form.append('invitation_body', invitationBody)
  const { data } = await client.post('/admin/invite/bulk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
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
