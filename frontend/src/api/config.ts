import client from './client'

export interface AppConfig {
  ldap_students: boolean
  ldap_consultants: boolean
  current_phase: string
  max_tag_choices: number
  assigned_tags_count: number
}

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await client.get('/config')
  return data
}
