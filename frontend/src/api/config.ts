import client from './client'

export type Phase = 'preparation' | 'selection' | 'conference'

export interface EventTitle {
  en: string
  de: string
  fr: string
}

export interface AppConfig {
  ldap_students: boolean
  ldap_consultants: boolean
  current_phase: Phase
  max_tag_choices: number
  assigned_tags_count: number
  admin_email: string
  event_title: EventTitle
}

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await client.get('/config')
  return data
}

export async function setPhase(phase: Phase): Promise<void> {
  await client.post('/admin/phase', { phase })
}

export async function setEventTitle(eventTitle: EventTitle): Promise<void> {
  await client.post('/admin/event-title', eventTitle)
}
