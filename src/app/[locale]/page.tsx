"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AnalysisResponse } from "@/types"
import { ResultsDashboard } from "@/components/ResultsDashboard"
import { ComparisonDashboard } from "@/components/ComparisonDashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Loader2, Plus, Scale } from "lucide-react"
import { cn } from "@/lib/utils"

const EXAMPLE_SITES = ["stripe.com", "notion.so", "hubspot.com"] as const
const ANALYSIS_CLIENT_TIMEOUT_MS = 120_000

export default function Home() {
  const t = useTranslations("home")
  const locale = useLocale()
  const [mode, setMode] = useState<"single" | "compare">("single")
  
  // Single mode
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [loadingStep, setLoadingStep] = useState("")
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)
  
  // Compare mode
  const [url1, setUrl1] = useState("")
  const [url2, setUrl2] = useState("")
  const [isLoading1, setIsLoading1] = useState(false)
  const [isLoading2, setIsLoading2] = useState(false)
  const [data1, setData1] = useState<AnalysisResponse | null>(null)
  const [data2, setData2] = useState<AnalysisResponse | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

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
  
  const analyzeUrl = async (urlToAnalyze: string, setDataFn: (data: AnalysisResponse) => void, setLoadingFn: (loading: boolean) => void) => {
    if (!urlToAnalyze.trim()) return null
    
    setLoadingFn(true)
    
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), ANALYSIS_CLIENT_TIMEOUT_MS)
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToAnalyze, locale }),
        signal: controller.signal,
      })
      
      const result: AnalysisResponse = await response.json()
      window.clearTimeout(timeout)
      setLoadingFn(false)
      
      if (result.success) {
        setDataFn(result)
        return result
      }
      return null
    } catch {
      window.clearTimeout(timeout)
      setLoadingFn(false)
      return null
    }
  }
  
  const handleCompareBoth = async () => {
    setCompareError(null)
    
    if (!url1.trim() || !url2.trim()) {
      setCompareError("Veuillez entrer les deux URLs à comparer")
      return
    }
    
    const results = await Promise.all([
      analyzeUrl(url1, setData1, setIsLoading1),
      analyzeUrl(url2, setData2, setIsLoading2)
    ])
    
    if (!results[0] || !results[1]) {
      setCompareError("Échec de l'analyse d'une ou des deux URLs")
    }
  }

  return (
    <main className="container mx-auto flex max-w-6xl flex-col px-5 py-10 md:px-6 md:py-14">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "compare")} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-64 grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <Plus className="size-4" />
              Analyser
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <Scale className="size-4" />
              Comparer
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="single">
          {!data && !isLoading && (
            <section className="mx-auto flex w-full max-w-3xl flex-col items-center pt-10 text-center md:pt-16">
              <p className="text-eyebrow mb-5">{t("eyebrow")}</p>

              <h1 className="text-display max-w-2xl">{t("title")}</h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.02rem]">
                {t("subtitle")}
              </p>

              <form
                onSubmit={handleAnalyze}
                className="surface-elevated pulse-border mt-10 flex w-full max-w-2xl flex-col gap-3 p-2 sm:flex-row sm:items-center"
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
                    className="rounded-full border border-border/80 bg-card/70 px-3 py-1 font-mono text-[0.72rem] text-muted-foreground transition-all hover:border-foreground/25 hover:text-foreground hover:scale-105"
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
        </TabsContent>
        
        <TabsContent value="compare">
          <section className="mx-auto flex w-full max-w-4xl flex-col items-center pt-10 md:pt-16">
            <p className="text-eyebrow mb-5">COMPARAISON</p>
            <h1 className="text-display max-w-2xl text-center">Comparez deux entreprises</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.02rem] text-center">
              Analysez et comparez le potentiel commercial de deux entreprises
            </p>
            
            <div className="mt-10 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="surface-elevated p-4">
                <p className="text-eyebrow mb-3">ENTREPRISE 1</p>
                <div className="flex flex-col gap-3">
                  <Input
                    value={url1}
                    onChange={(e) => setUrl1(e.target.value)}
                    placeholder="https://exemple1.com"
                    className="h-12"
                    disabled={isLoading1}
                  />
                  {data1 && (
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Plus className="size-4" />
                      {data1.insights?.companyName || "Analyse terminée"}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="surface-elevated p-4">
                <p className="text-eyebrow mb-3">ENTREPRISE 2</p>
                <div className="flex flex-col gap-3">
                  <Input
                    value={url2}
                    onChange={(e) => setUrl2(e.target.value)}
                    placeholder="https://exemple2.com"
                    className="h-12"
                    disabled={isLoading2}
                  />
                  {data2 && (
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Plus className="size-4" />
                      {data2.insights?.companyName || "Analyse terminée"}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleCompareBoth}
              disabled={isLoading1 || isLoading2}
              size="lg"
              className="mt-6 h-12 rounded-lg px-8 font-medium tracking-tight"
            >
              {isLoading1 || isLoading2 ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Scale className="size-4 mr-2" />
              )}
              Comparer
            </Button>
            
            {compareError && (
              <div className="mt-6 w-full max-w-2xl rounded-xl border border-foreground/15 bg-muted/40 px-6 py-4 text-center">
                <p className="text-sm font-medium">{compareError}</p>
              </div>
            )}
            
            {data1 && data2 && !isLoading1 && !isLoading2 && (
              <div className="mt-10 w-full">
                <ComparisonDashboard data1={data1} data2={data2} />
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </main>
  )
}
