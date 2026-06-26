"use client"

import { AnalysisResponse } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Building2, Globe, Check, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComparisonDashboardProps {
  data1: AnalysisResponse
  data2: AnalysisResponse
}

export function ComparisonDashboard({ data1, data2 }: ComparisonDashboardProps) {
  // Compare scores
  const score1 = data1.scores?.overallFit?.score || 0
  const score2 = data2.scores?.overallFit?.score || 0
  const winner = score1 > score2 ? 1 : score2 > score1 ? 2 : null
  
  const companyName1 = data1.insights?.companyName || data1.website?.domain || "Entreprise 1"
  const companyName2 = data2.insights?.companyName || data2.website?.domain || "Entreprise 2"

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none ring-0">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-6">
          <div className="text-center mb-4">
            <p className="text-eyebrow">RÉSULTATS</p>
            <h2 className="text-section mt-2">Comparaison des potentiels</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Company 1 */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                {winner === 1 && <Trophy className="size-6 text-yellow-500" />}
                <h3 className="text-xl font-bold">{companyName1}</h3>
              </div>
              <div className="text-5xl font-bold text-foreground">{score1}<span className="text-2xl text-muted-foreground">/100</span></div>
              <Badge variant={score1 >= 70 ? "default" : "secondary"}>{data1.scores?.overallFit?.fitLabel || "N/A"}</Badge>
            </div>
            
            {/* VS */}
            <div className="text-center">
              <div className="text-eyebrow text-xl font-bold">VS</div>
            </div>
            
            {/* Company 2 */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-xl font-bold">{companyName2}</h3>
                {winner === 2 && <Trophy className="size-6 text-yellow-500" />}
              </div>
              <div className="text-5xl font-bold text-foreground">{score2}<span className="text-2xl text-muted-foreground">/100</span></div>
              <Badge variant={score2 >= 70 ? "default" : "secondary"}>{data2.scores?.overallFit?.fitLabel || "N/A"}</Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {winner && (
            <div className="text-center mb-6 p-4 bg-muted/40 rounded-xl">
              <p className="text-lg font-medium">
                <Trophy className="size-5 inline-block mr-2 text-yellow-500" />
                {winner === 1 ? companyName1 : companyName2} a un potentiel commercial plus élevé
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Comparison */}
      <Card className="border-border/80 bg-card/75 shadow-none ring-0">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="font-heading text-xl tracking-[-0.02em]">Comparaison détaillée des scores</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Segment Scores 1 */}
              <div className="space-y-3">
                <h4 className="text-eyebrow">{companyName1}</h4>
                {data1.scores && (
                  <div className="space-y-2">
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">B2B SaaS</span>
                      <span className="text-xl font-bold">{data1.scores.b2bSaaS.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">Entreprise</span>
                      <span className="text-xl font-bold">{data1.scores.enterprise.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">Startup</span>
                      <span className="text-xl font-bold">{data1.scores.startup.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">E-commerce</span>
                      <span className="text-xl font-bold">{data1.scores.ecommerce.score}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Segment Scores 2 */}
              <div className="space-y-3">
                <h4 className="text-eyebrow">{companyName2}</h4>
                {data2.scores && (
                  <div className="space-y-2">
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">B2B SaaS</span>
                      <span className="text-xl font-bold">{data2.scores.b2bSaaS.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">Entreprise</span>
                      <span className="text-xl font-bold">{data2.scores.enterprise.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">Startup</span>
                      <span className="text-xl font-bold">{data2.scores.startup.score}</span>
                    </div>
                    <div className="surface-muted p-3 flex justify-between items-center">
                      <span className="text-sm">E-commerce</span>
                      <span className="text-xl font-bold">{data2.scores.ecommerce.score}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company 1 Details */}
        <Card className="border-border/80 bg-card/75 shadow-none ring-0">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-heading text-xl tracking-[-0.02em]">{companyName1}</CardTitle>
            <CardDescription>{data1.insights?.industry || "Industrie inconnue"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data1.insights?.businessModel || "N/A"}</Badge>
              <Badge variant="secondary">{data1.insights?.companySize || "N/A"}</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-eyebrow">Signaux GTM</h4>
              <div className="grid grid-cols-2 gap-2">
                {data1.insights?.gtmSignals && Object.entries(data1.insights.gtmSignals).map(([key, value]) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                      value
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border/70 bg-muted/20 text-muted-foreground"
                    )}
                  >
                    <span>{key}</span>
                    {value ? <Check className="size-4" /> : <X className="size-4" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company 2 Details */}
        <Card className="border-border/80 bg-card/75 shadow-none ring-0">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-heading text-xl tracking-[-0.02em]">{companyName2}</CardTitle>
            <CardDescription>{data2.insights?.industry || "Industrie inconnue"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data2.insights?.businessModel || "N/A"}</Badge>
              <Badge variant="secondary">{data2.insights?.companySize || "N/A"}</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-eyebrow">Signaux GTM</h4>
              <div className="grid grid-cols-2 gap-2">
                {data2.insights?.gtmSignals && Object.entries(data2.insights.gtmSignals).map(([key, value]) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                      value
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border/70 bg-muted/20 text-muted-foreground"
                    )}
                  >
                    <span>{key}</span>
                    {value ? <Check className="size-4" /> : <X className="size-4" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
