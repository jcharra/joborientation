import client from './client'

export const SLOT_GROUPS = [
  {
    key: 'in_person',
    label: 'Vor Ort im DFG/LFA / sur place um / à',
    slots: [
      { id: 'in_person_1330', time: '13h30' },
      { id: 'in_person_1430', time: '14h30' },
      { id: 'in_person_1530', time: '15h30' },
      { id: 'in_person_1630', time: '16h30' },
    ],
  },
  {
    key: 'video',
    label: 'Per Videokonferenz / Par visioconférence um / à',
    slots: [
      { id: 'video_1330', time: '13h30' },
      { id: 'video_1430', time: '14h30' },
      { id: 'video_1530', time: '15h30' },
      { id: 'video_1630', time: '16h30' },
    ],
  },
  {
    key: 'reception',
    label: 'Anschließende Ansprachen und Apéro / Discours, suivis du verre de l\'amitié',
    slots: [
      { id: 'reception_1745', time: '17h45' },
    ],
  },
] as const

export type SlotId =
  | 'in_person_1330' | 'in_person_1430' | 'in_person_1530' | 'in_person_1630'
  | 'video_1330'     | 'video_1430'     | 'video_1530'     | 'video_1630'
  | 'reception_1745'

export interface ConsultantSession {
  id: number
  title: string
  description: string | null
  selected_slots: SlotId[]
  tag: { id: number; name: string; slug: string } | null
}

export async function fetchConsultantSession(): Promise<ConsultantSession | null> {
  const { data } = await client.get('/consultant/session')
  return data
}

export async function updateConsultantSession(payload: {
  title: string
  description: string | null
  selected_slots: SlotId[]
}): Promise<ConsultantSession> {
  const { data } = await client.post('/consultant/session', payload)
  return data
}
