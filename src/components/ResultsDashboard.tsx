"use client"

import { useTranslations } from "next-intl"
import { AnalysisResponse, SegmentScore } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  Globe,
  Link2,
  Mail,
  Minus,
  MonitorSmartphone,
  Phone,
  Server,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getKeyPages, getSocialPlatform } from "@/lib/link-utils"

export function ResultsDashboard({ data }: { data: AnalysisResponse }) {
  const t = useTranslations("dashboard")

  if (!data.website || !data.insights || !data.technologies || !data.scores) return null

  const { website, insights, technologies, scores } = data
  const fit = scores.overallFit
  const keyPages = getKeyPages(website)

  const hunterEmails =
    data.hunter?.contacts.map((c) => c.value).filter((e) => e.includes("@")) ?? []
  const allEmails = Array.from(new Set([...website.emails, ...hunterEmails])).slice(0, 12)

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none ring-0">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {website.favicon ? (
                <img
                  src={website.favicon}
                  alt=""
                  className="size-12 rounded-lg border border-border/80 bg-background p-1.5"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-lg border border-border/80 bg-muted/40">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-eyebrow">{t("companyOverview")}</p>
                <CardTitle className="font-heading text-3xl tracking-[-0.02em]">
                  {insights.companyName || t("unknownCompany")}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-sm">
                  <Globe className="size-3.5" />
                  <a
                    href={website.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    {website.url}
                    <ArrowUpRight className="size-3 opacity-60" />
                  </a>
                </CardDescription>
              </div>
            </div>

            <div className="surface-muted min-w-[9rem] px-4 py-3 text-right">
              <p className="text-eyebrow mb-1">{t("overall")}</p>
              <p className="font-heading text-4xl leading-none tracking-[-0.03em]">
                {fit.score}
                <span className="ml-1 text-lg text-muted-foreground">/100</span>
              </p>
              <Badge variant="outline" className="mt-2 font-mono text-[0.62rem] uppercase tracking-wider">
                {fit.fitLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <p className="max-w-3xl text-base leading-relaxed text-foreground/90 md:text-[1.02rem]">
            {insights.summary}
          </p>

          <div className="flex flex-wrap gap-2">
            <MetaPill icon={<Building2 className="size-3.5" />} label={t("industry")} value={insights.industry} />
            <MetaPill
              icon={<Briefcase className="size-3.5" />}
              label={t("businessModel")}
              value={insights.businessModel}
            />
            <MetaPill
              icon={<Zap className="size-3.5" />}
              label={t("targetMarket")}
              value={t(`targetMarkets.${insights.targetMarket}`)}
            />
            <MetaPill
              icon={<Building2 className="size-3.5" />}
              label={t("companySize")}
              value={t(`companySizes.${insights.companySize}`)}
            />
          </div>
        </CardContent>
      </Card>

      <DashboardPanel title={t("fitScores")} description={t("fitScoresDescription")}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-eyebrow">{t("criteria")}</h4>
            <div className="overflow-hidden rounded-lg border border-border/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium">{t("criteriaColumn")}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t("pointsColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {fit.criteria.map((criterion) => (
                    <tr
                      key={criterion.id}
                      className={cn(
                        "border-b border-border/40 last:border-0",
                        criterion.met ? "bg-foreground/[0.03]" : "text-muted-foreground"
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {criterion.met ? (
                            <Check className="size-3.5 shrink-0" />
                          ) : (
                            <X className="size-3.5 shrink-0 opacity-40" />
                          )}
                          <span>{criterion.label}</span>
                          {criterion.detail && (
                            <span className="text-xs text-muted-foreground">({criterion.detail})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {criterion.met ? `+${criterion.points}` : `0`}/{criterion.maxPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h4 className="text-eyebrow mb-3">{t("matchedSignals")}</h4>
              {fit.positives.length > 0 ? (
                <ul className="space-y-2">
                  {fit.positives.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noLinksFound")}</p>
              )}
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <p className="text-eyebrow mb-2">{t("verdictTitle")}</p>
              <p className="text-sm leading-relaxed">
                <span className="mr-1">→</span>
                {fit.verdict}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6">
          <div className="mb-4 space-y-1">
            <h4 className="text-eyebrow">{t("segmentScores")}</h4>
            <p className="text-xs text-muted-foreground">{t("segmentScoresHelp")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SegmentScoreCard label={t("b2bSaas")} segment={scores.b2bSaaS} />
            <SegmentScoreCard label={t("enterprise")} segment={scores.enterprise} />
            <SegmentScoreCard label={t("startup")} segment={scores.startup} />
            <SegmentScoreCard label={t("ecommerce")} segment={scores.ecommerce} />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel title={t("discoveredLinks")} description={t("discoveredLinksDescription")}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LinkGroup
            title={t("emails")}
            icon={<Mail className="size-3.5" />}
            empty={t("noneDetected")}
            items={allEmails.map((email) => ({ href: `mailto:${email}`, label: email }))}
          />
          <LinkGroup
            title={t("phones")}
            icon={<Phone className="size-3.5" />}
            empty={t("noneDetected")}
            items={website.phones.map((phone) => ({
              href: `tel:${phone.replace(/\s/g, "")}`,
              label: phone,
            }))}
          />
          <LinkGroup
            title={t("socialProfiles")}
            icon={<Globe className="size-3.5" />}
            empty={t("noneDetected")}
            items={website.links.social.map((url) => ({
              href: url,
              label: t(`socialPlatforms.${getSocialPlatform(url)}`),
              external: true,
            }))}
          />
          <LinkGroup
            title={t("contactLinks")}
            icon={<Link2 className="size-3.5" />}
            empty={t("noneDetected")}
            items={website.links.contact.map((href) => ({
              href,
              label: href.replace(/^mailto:/i, "").replace(/^tel:/i, ""),
            }))}
          />
        </div>

        {keyPages.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <h4 className="text-eyebrow mb-3">{t("keyPages")}</h4>
            <div className="flex flex-wrap gap-2">
              {keyPages.map((page) => (
                <a
                  key={page.url}
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/70 px-3 py-1.5 text-sm transition-colors hover:border-foreground/25"
                >
                  {t(`pageLabels.${page.labelKey}` as "pageLabels.careers")}
                  <ArrowUpRight className="size-3 opacity-50" />
                </a>
              ))}
            </div>
          </div>
        )}

        {allEmails.length === 0 &&
          website.phones.length === 0 &&
          website.links.social.length === 0 &&
          website.links.contact.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{t("noLinksFound")}</p>
          )}
      </DashboardPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardPanel title={t("keyInsights")} description={t("keyInsightsDescription")}>
          <ul className="space-y-3">
            {insights.keyInsights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <span className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-sm leading-relaxed text-foreground/85">{insight}</span>
              </li>
            ))}
          </ul>
        </DashboardPanel>

        <DashboardPanel title={t("gtmSignals")}>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(insights.gtmSignals).map(([key, val]) => {
              const labels: Record<string, string> = {
                demoBooking: t("demo"),
                pricingPage: t("pricing"),
                contactSales: t("contactSales"),
                freeTrial: t("freeTrial"),
                selfServiceSignup: t("signup"),
              }

              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border px-3 py-3 transition-colors",
                    val
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border/70 bg-muted/20 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium leading-tight">{labels[key] || key}</span>
                    {val ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0 opacity-50" />}
                  </div>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] opacity-70">
                    {val ? t("detected") : t("notFound")}
                  </span>
                </div>
              )
            })}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title={t("webSignals")} description={t("webSignalsDescription")}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SignalStat label={t("internalPages")} value={website.links.internal.length} />
          <SignalStat label={t("externalLinks")} value={website.links.external.length} />
          <SignalStat label={t("socialMedia")} value={website.links.social.length} />
          <SignalStat
            label={t("visibleContacts")}
            value={website.emails.length + website.phones.length + website.links.contact.length}
          />
        </div>

        {website.headings.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <h4 className="text-eyebrow mb-3">{t("keyMessages")}</h4>
            <div className="flex flex-wrap gap-2">
              {website.headings.slice(0, 8).map((heading) => (
                <Badge
                  key={heading}
                  variant="outline"
                  className="max-w-full rounded-md border-border/80 bg-background/60 font-normal"
                >
                  <span className="truncate">{heading}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </DashboardPanel>

      {data.hunter && (
        <DashboardPanel
          title={t("hunterContacts")}
          description={[
            data.hunter.organization || data.hunter.domain,
            data.hunter.pattern && typeof data.hunter.pattern === "string"
              ? `${t("pattern")}: ${data.hunter.pattern}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {data.hunter.contacts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.hunter.contacts.slice(0, 6).map((contact) => (
                <div key={contact.value} className="surface-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={contact.value.includes("@") ? `mailto:${contact.value}` : undefined}
                        className="truncate font-medium hover:underline"
                      >
                        {contact.value}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                          contact.position ||
                          t("publicContact")}
                      </p>
                    </div>
                    {typeof contact.confidence === "number" && (
                      <Badge variant="outline" className="font-mono text-[0.65rem]">
                        {contact.confidence}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {contact.department && <Badge variant="secondary">{contact.department}</Badge>}
                    {contact.seniority && <Badge variant="secondary">{contact.seniority}</Badge>}
                    {contact.type && <Badge variant="outline">{contact.type}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noPublicEmails")}</p>
          )}
        </DashboardPanel>
      )}

      {data.apiUsageReport && data.apiUsageReport.length > 0 && (
        <DashboardPanel title={t("apiUsageReport")} description={t("apiUsageReportDescription")}>
          <div className="space-y-2.5">
            {data.apiUsageReport.map((report, idx) => {
              const statusLabels: Record<string, string> = {
                success: t("success"),
                fallback: t("fallback"),
                failed: t("failed"),
              }

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start justify-between gap-4 rounded-lg border px-4 py-3.5",
                    report.status === "success" && "border-foreground/25 bg-foreground/[0.03]",
                    report.status === "fallback" && "border-border bg-muted/25",
                    report.status === "failed" && "border-foreground/10 bg-muted/15 opacity-80"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{report.apiName}</span>
                      <Badge
                        variant={report.status === "success" ? "default" : "outline"}
                        className="font-mono text-[0.62rem] uppercase tracking-wider"
                      >
                        {statusLabels[report.status]}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{report.message}</p>
                  </div>
                  {report.duration && (
                    <p className="shrink-0 font-mono text-xs text-muted-foreground">{report.duration}ms</p>
                  )}
                </div>
              )
            })}
          </div>
        </DashboardPanel>
      )}

      <DashboardPanel title={t("techStack")}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TechCategory
            title={t("frontend")}
            icon={<MonitorSmartphone className="size-3.5" />}
            items={technologies.frontend}
            noneDetected={t("noneDetected")}
          />
          <TechCategory
            title={t("infrastructure")}
            icon={<Server className="size-3.5" />}
            items={technologies.infrastructure}
            noneDetected={t("noneDetected")}
          />
          <TechCategory
            title={t("analytics")}
            icon={<Minus className="size-3.5" />}
            items={technologies.analytics}
            noneDetected={t("noneDetected")}
          />
          <TechCategory
            title={t("marketing")}
            icon={<Zap className="size-3.5" />}
            items={technologies.marketing}
            noneDetected={t("noneDetected")}
          />
          <TechCategory
            title={t("crm")}
            icon={<Briefcase className="size-3.5" />}
            items={technologies.crm}
            noneDetected={t("noneDetected")}
          />
          <TechCategory
            title={t("cms")}
            icon={<Globe className="size-3.5" />}
            items={technologies.cms}
            noneDetected={t("noneDetected")}
          />
        </div>
      </DashboardPanel>
    </div>
  )
}

function DashboardPanel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/80 bg-card/75 shadow-none ring-0">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="font-heading text-xl tracking-[-0.02em]">{title}</CardTitle>
        {description && <CardDescription className="max-w-2xl">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  )
}

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-eyebrow normal-case tracking-[0.12em]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function SegmentScoreCard({ label, segment }: { label: string; segment: SegmentScore }) {
  return (
    <div className="surface-muted space-y-3 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{segment.reasoning}</p>
        </div>
        <span className="font-heading text-3xl leading-none tabular-nums">{segment.score}</span>
      </div>
      <div className="space-y-1.5 border-t border-border/50 pt-3">
        {segment.criteria.map((criterion) => (
          <div key={criterion.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={cn(!criterion.met && "text-muted-foreground")}>{criterion.label}</span>
            <span className="font-mono tabular-nums">
              {criterion.met ? `+${criterion.points}` : "0"}/{criterion.maxPoints}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkGroup({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: { href: string; label: string; external?: boolean }[]
  empty: string
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-eyebrow normal-case tracking-[0.14em]">
        {icon}
        {title}
      </h4>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                <span className="truncate">{item.label}</span>
                {item.external && <ArrowUpRight className="size-3 shrink-0 opacity-50" />}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

function SignalStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-muted p-4">
      <p className="font-heading text-3xl leading-none tracking-[-0.03em]">{value}</p>
      <p className="text-eyebrow mt-2 normal-case tracking-[0.12em]">{label}</p>
    </div>
  )
}

function TechCategory({
  title,
  items,
  icon,
  noneDetected,
}: {
  title: string
  items: string[]
  icon: React.ReactNode
  noneDetected: string
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 border-b border-border/60 pb-2 text-eyebrow normal-case tracking-[0.14em]">
        {icon}
        {title}
      </h4>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((tech) => (
            <Badge
              key={tech}
              variant="secondary"
              className="rounded-md border border-border/60 bg-background/70 px-2.5 py-0.5 font-mono text-[0.68rem] font-normal"
            >
              {tech}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">{noneDetected}</p>
      )}
    </div>
  )
}
