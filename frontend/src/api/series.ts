import client from './client'

export interface SeriesOption {
  id: number
  name: string
}

export async function fetchSeries(): Promise<SeriesOption[]> {
  const { data } = await client.get('/series')
  return data
}

export async function createSeries(name: string): Promise<SeriesOption> {
  const { data } = await client.post('/admin/series', { name })
  return data
}

export async function updateSeries(id: number, name: string): Promise<SeriesOption> {
  const { data } = await client.put(`/admin/series/${id}`, { name })
  return data
}

export async function deleteSeries(id: number): Promise<void> {
  await client.delete(`/admin/series/${id}`)
}
