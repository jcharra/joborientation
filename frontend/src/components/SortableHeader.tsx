import type { SortDirection } from '../hooks/useSortableData'

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string
  sortKey: K
  activeKey: K | null
  direction: SortDirection
  onSort: (key: K) => void
  className?: string
}) {
  const active = sortKey === activeKey

  return (
    <th className={className} onClick={() => onSort(sortKey)} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {label}
      <span aria-hidden="true">{active ? (direction === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}
