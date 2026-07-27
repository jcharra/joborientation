import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchConfig } from '../api/config'
import type { EventTitle } from '../api/config'

interface EventTitleContextValue {
  eventTitle: EventTitle | null
  setEventTitle: (eventTitle: EventTitle) => void
  eventLogoUrl: string | null
  setEventLogoUrl: (eventLogoUrl: string | null) => void
  setEventFaviconUrl: (eventFaviconUrl: string | null) => void
}

const EventTitleContext = createContext<EventTitleContextValue | null>(null)

const DEFAULT_FAVICON_HREF = '/favicon.svg'

function applyFavicon(href: string | null) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href ?? DEFAULT_FAVICON_HREF
}

export function EventTitleProvider({ children }: { children: ReactNode }) {
  const [eventTitle, setEventTitle] = useState<EventTitle | null>(null)
  const [eventLogoUrl, setEventLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig().then(config => {
      setEventTitle(config.event_title)
      setEventLogoUrl(config.event_logo_url)
      applyFavicon(config.event_favicon_url)
    }).catch(() => {})
  }, [])

  return (
    <EventTitleContext.Provider
      value={{ eventTitle, setEventTitle, eventLogoUrl, setEventLogoUrl, setEventFaviconUrl: applyFavicon }}
    >
      {children}
    </EventTitleContext.Provider>
  )
}

export function useEventTitle(): EventTitleContextValue {
  const ctx = useContext(EventTitleContext)
  if (!ctx) throw new Error('useEventTitle must be used inside EventTitleProvider')
  return ctx
}
