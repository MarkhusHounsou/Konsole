"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AnalysisResponse } from "@/types"
import { ResultsDashboard } from "@/components/ResultsDashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const EXAMPLE_SITES = ["stripe.com", "notion.so", "hubspot.com"] as const
const ANALYSIS_CLIENT_TIMEOUT_MS = 120_000

export default function Home() {
  const t = useTranslations("home")
  const locale = useLocale()
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [loadingStep, setLoadingStep] = useState("")
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError(t("error"))
      return
    }

    setError(null)
    setIsLoading(true)
    setData(null)

    const steps = [t("analyzing"), t("detecting"), t("generating"), t("calculating")]
    let stepIndex = 0
    setLoadingStepIndex(0)
    setLoadingStep(steps[0])

    const interval = setInterval(() => {
      stepIndex++
      if (stepIndex < steps.length) {
        setLoadingStepIndex(stepIndex)
        setLoadingStep(steps[stepIndex])
      } else {
        clearInterval(interval)
      }
    }, 2500)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), ANALYSIS_CLIENT_TIMEOUT_MS)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, locale }),
        signal: controller.signal,
      })

      const result: AnalysisResponse = await response.json()

      clearInterval(interval)

      if (!result.success) {
        setError(result.error || t("analysisFailed"))
      } else {
        setData(result)
      }
    } catch (err: unknown) {
      clearInterval(interval)
      setError(
        err instanceof Error && err.name === "AbortError"
          ? t("timeoutError")
          : err instanceof Error
            ? err.message
            : t("unexpectedError")
      )
    } finally {
      window.clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto flex max-w-5xl flex-col px-5 py-10 md:px-6 md:py-14">
      {!data && !isLoading && (
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center pt-10 text-center md:pt-16">
          <p className="text-eyebrow mb-5">{t("eyebrow")}</p>

          <h1 className="text-display max-w-2xl">{t("title")}</h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.05rem]">
            {t("subtitle")}
          </p>

          <form
            onSubmit={handleAnalyze}
            className="surface-elevated mt-10 flex w-full max-w-2xl flex-col gap-3 p-2 sm:flex-row sm:items-center"
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("placeholder")}
              className="h-12 flex-1 border-0 bg-transparent px-4 text-base shadow-none focus-visible:ring-0 md:text-[0.95rem]"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="h-12 rounded-lg px-6 font-medium tracking-tight"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {t("button")}
                  <ArrowRight className="size-4 opacity-70" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-eyebrow mr-1 normal-case tracking-[0.14em]">
              {t("try")}
            </span>
            {EXAMPLE_SITES.map((site) => (
              <button
                key={site}
                type="button"
                onClick={() => setUrl(`https://${site}`)}
                className="rounded-full border border-border/80 bg-card/70 px-3 py-1 font-mono text-[0.72rem] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                {site}
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-10 pt-24 md:pt-32">
          <div className="flex w-full gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-px flex-1 rounded-full transition-all duration-500",
                  index <= loadingStepIndex ? "bg-foreground" : "bg-border"
                )}
              />
            ))}
          </div>

          <div className="space-y-3 text-center">
            <p className="text-eyebrow">{t("processing")}</p>
            <p className="font-heading text-2xl tracking-[-0.02em]">{loadingStep}</p>
          </div>

          <div className="flex size-10 items-center justify-center rounded-full border border-border">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        </section>
      )}

      {error && !isLoading && (
        <div className="mx-auto mt-10 w-full max-w-2xl rounded-xl border border-foreground/15 bg-muted/40 px-6 py-4 text-center">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {data && !isLoading && (
        <section className="w-full">
          <div className="mb-10 flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-eyebrow">{t("report")}</p>
              <h2 className="text-section">{t("analysisResults")}</h2>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setData(null)
                setUrl("")
              }}
              className="h-9 border-border/80 bg-card/60"
            >
              {t("analyzeAnother")}
            </Button>
          </div>
          <ResultsDashboard data={data} />
        </section>
      )}
    </main>
  )
}
