"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl"
import { routing, type Locale } from "@/i18n/routing"
import enMessages from "../../messages/en.json"
import frMessages from "../../messages/fr.json"

const messagesByLocale: Record<Locale, AbstractIntlMessages> = {
  en: enMessages,
  fr: frMessages,
}

type LocaleSwitchContextValue = {
  locale: Locale
  switchLocale: (locale: Locale) => void
}

const LocaleSwitchContext = createContext<LocaleSwitchContextValue | null>(null)

function syncLocaleToBrowser(locale: Locale) {
  document.documentElement.lang = locale
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`

  const segments = window.location.pathname.split("/")
  if (segments[1] === "en" || segments[1] === "fr") {
    segments[1] = locale
    const nextPath = segments.join("/") || "/"
    window.history.replaceState(null, "", `${nextPath}${window.location.search}`)
  }

  const meta = messagesByLocale[locale] as { metadata?: { title?: string } }
  if (meta.metadata?.title) {
    document.title = meta.metadata.title
  }
}

export function DynamicIntlProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale: Locale
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<AbstractIntlMessages>(
    messagesByLocale[initialLocale]
  )

  const switchLocale = useCallback((newLocale: Locale) => {
    if (!routing.locales.includes(newLocale) || newLocale === locale) return

    setLocale(newLocale)
    setMessages(messagesByLocale[newLocale])
    syncLocaleToBrowser(newLocale)
  }, [locale])

  return (
    <LocaleSwitchContext.Provider value={{ locale, switchLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleSwitchContext.Provider>
  )
}

export function useLocaleSwitch() {
  const context = useContext(LocaleSwitchContext)
  if (!context) {
    throw new Error("useLocaleSwitch must be used within DynamicIntlProvider")
  }
  return context
}
