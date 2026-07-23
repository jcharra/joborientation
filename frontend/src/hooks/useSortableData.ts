import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

type Accessor<T> = (item: T) => string | number | null

export function useSortableData<T, K extends string>(items: T[], accessors: Record<K, Accessor<T>>) {
  const [sortKey, setSortKey] = useState<K | null>(null)
  const [direction, setDirection] = useState<SortDirection>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return items
    const accessor = accessors[sortKey]
    const copy = [...items]
    copy.sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return direction === 'asc' ? cmp : -cmp
    })
    return copy
  }, [items, sortKey, direction, accessors])

  function requestSort(key: K) {
    if (sortKey === key) {
      setDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  return { sorted, sortKey, direction, requestSort }
}
