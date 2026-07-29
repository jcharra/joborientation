export function formatPhaseDate(iso: string): string {
  const d = new Date(iso)
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${d.getHours()}:${minutes}`
}
