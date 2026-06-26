"use client"

import { useTranslations } from "next-intl"
import { LanguageToggle } from "@/components/language-toggle"
import { ModeToggle } from "@/components/mode-toggle"

export function AppHeader() {
  const t = useTranslations("common")

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="container mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-5 md:px-6">
        <div className="flex items-center gap-3.5">
          <div className="relative flex size-9 items-center justify-center rounded-md border border-foreground/15 bg-foreground text-background shadow-sm">
            <span className="font-heading text-lg leading-none">K</span>
            <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-background ring-2 ring-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-[1.35rem] leading-none tracking-[-0.02em]">
              {t("brandName")}
            </span>
            <span className="text-eyebrow hidden sm:block">{t("tagline")}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/60 p-1 shadow-sm">
          <LanguageToggle />
          <div className="h-5 w-px bg-border/80" />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
