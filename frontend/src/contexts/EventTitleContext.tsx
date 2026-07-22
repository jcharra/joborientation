import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchConfig } from '../api/config'
import type { EventTitle } from '../api/config'

interface EventTitleContextValue {
  eventTitle: EventTitle | null
  setEventTitle: (eventTitle: EventTitle) => void
}

const EventTitleContext = createContext<EventTitleContextValue | null>(null)

export function EventTitleProvider({ children }: { children: ReactNode }) {
  const [eventTitle, setEventTitle] = useState<EventTitle | null>(null)

  useEffect(() => {
    fetchConfig().then(config => setEventTitle(config.event_title)).catch(() => {})
  }, [])

  return (
    <EventTitleContext.Provider value={{ eventTitle, setEventTitle }}>
      {children}
    </EventTitleContext.Provider>
  )
}

export function useEventTitle(): EventTitleContextValue {
  const ctx = useContext(EventTitleContext)
  if (!ctx) throw new Error('useEventTitle must be used inside EventTitleProvider')
  return ctx
}
