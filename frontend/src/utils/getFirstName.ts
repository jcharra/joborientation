export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  return trimmed.split(/\s+/)[0] ?? trimmed
}
