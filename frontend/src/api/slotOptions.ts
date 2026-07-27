import client from './client'

export type SlotKind = 'presentation' | 'reception'

export interface SlotOption {
  id: number
  kind: SlotKind
  start_time: string
  end_time: string
}

export async function fetchSlotOptions(): Promise<SlotOption[]> {
  const { data } = await client.get('/slot-options')
  return data
}

export async function createSlotOption(payload: { kind: SlotKind; start_time: string; end_time: string }): Promise<SlotOption> {
  const { data } = await client.post('/admin/slot-options', payload)
  return data
}

export async function updateSlotOption(id: number, payload: { kind: SlotKind; start_time: string; end_time: string }): Promise<SlotOption> {
  const { data } = await client.put(`/admin/slot-options/${id}`, payload)
  return data
}

export async function deleteSlotOption(id: number): Promise<void> {
  await client.delete(`/admin/slot-options/${id}`)
}
