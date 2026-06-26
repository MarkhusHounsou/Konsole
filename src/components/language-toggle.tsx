"use client"

import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useLocaleSwitch } from "@/components/dynamic-intl-provider"
import { type Locale } from "@/i18n/routing"

export function LanguageToggle() {
  const locale = useLocale() as Locale
  const t = useTranslations("common")
  const { switchLocale } = useLocaleSwitch()

  const toggleLocale = () => {
    switchLocale(locale === "en" ? "fr" : "en")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      title={locale === "en" ? t("switchToFrench") : t("switchToEnglish")}
      className="h-8 gap-1.5 px-2.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      <Languages className="size-3.5 opacity-70" />
      <span className="sr-only">{t("toggleLanguage")}</span>
      <span>{locale}</span>
    </Button>
  )
}
