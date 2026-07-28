import client from './client'

export const MIN_TALK_SELECTIONS = 4
export const MAX_TALK_SELECTIONS = 6

export interface StudentSelectionData {
  topic_ids: number[]
}

export async function fetchStudentSelection(): Promise<StudentSelectionData> {
  const { data } = await client.get('/student/selection')
  return data
}

export async function saveStudentSelection(topicIds: number[]): Promise<StudentSelectionData> {
  const { data } = await client.post('/student/selection', { topic_ids: topicIds })
  return data
}
