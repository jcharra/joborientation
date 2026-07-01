import client from './client'
import type { User } from './auth'

export interface Tag {
  id: number
  name: string
  slug: string
}

export interface AdminTopic {
  id: number
  title: string
  description: string | null
  consultant_id: number
  tag_id: number
  consultant: Pick<User, 'id' | 'name' | 'email'>
  tag: Tag
  created_at: string
}

export async function fetchAdminStudents(): Promise<User[]> {
  const { data } = await client.get('/admin/students')
  return data
}

export async function fetchAdminConsultants(): Promise<User[]> {
  const { data } = await client.get('/admin/consultants')
  return data
}

export async function fetchAdminTopics(): Promise<AdminTopic[]> {
  const { data } = await client.get('/admin/topics')
  return data
}
