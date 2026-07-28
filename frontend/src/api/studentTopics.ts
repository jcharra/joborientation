import client from './client'
import type { SlotId } from './session'
import type { ConsultantProfileData } from './profile'

export interface StudentTopic {
  id: number
  title: string
  description: string | null
  selected_slots: SlotId[]
  tag: { id: number; name: string; slug: string } | null
  time_slots: { id: number; room: string | null }[]
  consultant: {
    id: number
    name: string
    consultant_profile: ConsultantProfileData | null
  }
}

export async function fetchStudentTopics(): Promise<StudentTopic[]> {
  const { data } = await client.get('/student/topics')
  return data
}
