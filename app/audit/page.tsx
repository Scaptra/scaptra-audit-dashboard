"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Globe,
  Mail,
  Phone,
  Radar,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type AuditReportRow = {
  id: string;
  submission_id: string;
  executive_summary?: string | null;
  engagement_flow_map?: string | null;
  lead_leakage_summary?: string | null;
  created_at?: string | null;
};

type AuditSubmissionRow = {
  id: string;
  business_id: string;
  status?: string | null;
  submission_source?: string | null;
  created_at?: string | null;
};

type BusinessRow = {
  id: string;
  business_name?: string | null;
  website_url?: string | null;
};

type QuestionnaireRow = {
  id: string;
  submission_id: string;
  responses?: Record<string, any> | null;
  additional_notes?: string | null;
  enquiry_channels?: string[] | null;
  response_time?: string | null;
  after_hours_coverage?: string | null;
};

type ScanRow = {
  id: string;
  business_id: string;
  website_url: string;
  scan_status?: string | null;
  created_at?: string | null;
  scan_started_at?: string | null;
  scan_completed_at?: string | null;
};

type ScanPageRow = {
  id: string;
  scan_id: string;
  page_url?: string | null;
  page_title?: string | null;
  http_status?: number | null;
};

type FindingRow = {
  id: string;
  page_id: string;
  finding_type?: string | null;
  finding_value?: string | null;
  finding_context?: string | null;
};

type Finding = {
  type: string;
  value: string;
  context: string;
};

type PageScan = {
  url: string;
  title: string;
  status: number;
};

type ReportData = {
  companyName: string;
  websiteUrl: string;
  generatedAt: string;
  scanStatus: string;
  pagesScanned: number;
  overallScore: number;
  executiveSummary: string;
  engagementFlowMap: string;
  leadLeakageSummary: string;
  topOpportunities: string[];
  findings: Finding[];
  pages: PageScan[];
  channels: string[];
  responseTime: string;
  afterHoursCoverage: string;
  scores: {
    capture: number;
    trust: number;
    speed: number;
    followUp: number;
    automation: number;
    clarity: number;
  };
};

const mockReport: ReportData = {
  companyName: "Scaptra AI",
  websiteUrl: "https://scaptra.ai",
  generatedAt: "15 Mar 2026, 10:12 AM",
  scanStatus: "completed",
  pagesScanned: 10,
  overallScore: 67,
  executiveSummary:
    "This business shows strong intent to capture leads but still leaks opportunity through inconsistent contact visibility, limited response assurance, and weak after-hours conversion pathways. The current setup is credible, but not yet optimized for maximum enquiry conversion.",
  engagementFlowMap:
    "Current engagement flow: visitors land on service pages, browse offer content, and can reach out through email, phone, website form, and calendar booking. Conversion pathways exist, but they are not reinforced consistently across every high-intent page.",
  leadLeakageSummary:
    "Primary lead leakage risks include inconsistent CTA placement, insufficient reassurance around response times, and limited visible automation or after-hours handling for inbound enquiries.",
  topOpportunities: [
    "Add a persistent primary CTA across all key pages",
    "Introduce AI-backed after-hours enquiry capture and instant acknowledgement",
    "Standardize contact options and response-time messaging site-wide",
    "Use appointment booking prompts on high-intent service pages",
  ],
  findings: [
    { type: "email_address", value: "support@scaptra.ai", context: "Detected from page markdown" },
    { type: "email_address", value: "sales@scaptra.com", context: "Detected from page markdown" },
    { type: "phone_number", value: "+61 477 057 515", context: "Footer contact number" },
    { type: "booking_widget", value: "Calendly", context: "Detected booking widget" },
  ],
  pages: [
    { url: "https://scaptra.ai/", title: "Scaptra AI – Multilingual Chatbots & Business Automation", status: 200 },
    { url: "https://scaptra.ai/services", title: "Scaptra AI Services – Chatbots, Lead Regeneration & Automation", status: 200 },
    { url: "https://scaptra.ai/contact-us", title: "Scaptra AI – Contact Us", status: 200 },
    { url: "https://scaptra.ai/privacy", title: "Privacy Policy", status: 200 },
  ],
  channels: ["website_form", "phone", "email", "booking_widget"],
  responseTime: "within 30 minutes",
  afterHoursCoverage: "limited",
  scores: {
    capture: 71,
    trust: 64,
    speed: 59,
    followUp: 54,
    automation: 48,
    clarity: 73,
  },
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

function getReportIdentifier() {
  if (typeof window === "undefined") return "";
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1] || "";
  const params = new URLSearchParams(window.location.search);
  return params.get("submission_id") || params.get("report_id") || lastPathPart || "";
}

function prettifyDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [];
}

function deriveChannels(findings: FindingRow[], questionnaire?: QuestionnaireRow | null) {
  const channels = new Set<string>();

  findings.forEach((finding) => {
    if (finding.finding_type === "email_address") channels.add("email");
    if (finding.finding_type === "phone_number") channels.add("phone");
    if (finding.finding_type === "booking_widget") channels.add("booking_widget");
  });

  toArray(questionnaire?.enquiry_channels).forEach((channel) => channels.add(channel));

  if (channels.size === 0) channels.add("website_form");
  return Array.from(channels);
}

function deriveScores(findings: FindingRow[], questionnaire?: QuestionnaireRow | null) {
  const hasEmail = findings.some((f) => f.finding_type === "email_address");
  const hasPhone = findings.some((f) => f.finding_type === "phone_number");
  const hasBooking = findings.some((f) => f.finding_type === "booking_widget");
  const responseTime = String(questionnaire?.response_time || "").toLowerCase();
  const afterHours = String(questionnaire?.after_hours_coverage || "").toLowerCase();

  let capture = 45;
  if (hasEmail) capture += 10;
  if (hasPhone) capture += 10;
  if (hasBooking) capture += 15;

  let trust = 58;
  if (hasEmail) trust += 6;
  if (hasPhone) trust += 6;

  let speed = 45;
  if (responseTime.includes("5")) speed = 85;
  else if (responseTime.includes("15")) speed = 75;
  else if (responseTime.includes("30")) speed = 65;
  else if (responseTime.includes("hour")) speed = 52;

  let followUp = 42;
  if (questionnaire?.response_time) followUp += 15;
  if (questionnaire?.enquiry_channels && questionnaire.enquiry_channels.length > 1) followUp += 15;

  let automation = 35;
  if (hasBooking) automation += 15;
  if (afterHours.includes("full") || afterHours.includes("24")) automation += 30;
  else if (afterHours.includes("limited")) automation += 12;

  let clarity = 60;
  if (hasEmail || hasPhone) clarity += 8;
  if (hasBooking) clarity += 8;

  return {
    capture: Math.min(100, capture),
    trust: Math.min(100, trust),
    speed: Math.min(100, speed),
    followUp: Math.min(100, followUp),
    automation: Math.min(100, automation),
    clarity: Math.min(100, clarity),
  };
}

function buildReportData(args: {
  business: BusinessRow | null;
  report: AuditReportRow | null;
  submission: AuditSubmissionRow | null;
  questionnaire: QuestionnaireRow | null;
  scan: ScanRow | null;
  pages: ScanPageRow[];
  findings: FindingRow[];
}): ReportData {
  const scores = deriveScores(args.findings, args.questionnaire);
  const overallScore = Math.round(
    (scores.capture + scores.trust + scores.speed + scores.followUp + scores.automation + scores.clarity) / 6,
  );

  return {
    companyName: args.business?.business_name || "Business Audit",
    websiteUrl: args.scan?.website_url || args.business?.website_url || "",
    generatedAt: prettifyDate(args.report?.created_at || args.submission?.created_at || args.scan?.scan_completed_at),
    scanStatus: args.scan?.scan_status || args.submission?.status || "completed",
    pagesScanned: args.pages.length,
    overallScore,
    executiveSummary:
      args.report?.executive_summary ||
      "This website has been scanned successfully. The report below highlights current lead capture strength, engagement risks, and the clearest automation opportunities.",
    engagementFlowMap:
      args.report?.engagement_flow_map ||
      "Visitors arrive on service and information pages, discover available contact channels, and either enquire directly or leave without engaging when the response path is weak or unclear.",
    leadLeakageSummary:
      args.report?.lead_leakage_summary ||
      "The biggest leakage points are usually inconsistent calls to action, limited after-hours handling, weak response reassurance, and poor follow-up structure.",
    topOpportunities: [
      "Improve response certainty with immediate acknowledgement and after-hours handling",
      "Make primary contact pathways visible on every high-intent page",
      "Strengthen follow-up automation for enquiries that do not book immediately",
      "Use the audit findings to standardize conversion flow across the site",
    ],
    findings: args.findings.map((f) => ({
      type: f.finding_type || "unknown",
      value: f.finding_value || "Unknown",
      context: f.finding_context || "Detected from scan",
    })),
    pages: args.pages.map((p) => ({
      url: p.page_url || args.scan?.website_url || args.business?.website_url || "",
      title: p.page_title || "Untitled page",
      status: p.http_status || 200,
    })),
    channels: deriveChannels(args.findings, args.questionnaire),
    responseTime: String(args.questionnaire?.response_time || "not stated"),
    afterHoursCoverage: String(args.questionnaire?.after_hours_coverage || "unknown"),
    scores,
  };
}

function radarDataFromScores(scores: ReportData["scores"]) {
  return [
    { area: "Capture", value: scores.capture },
    { area: "Trust", value: scores.trust },
    { area: "Speed", value: scores.speed },
    { area: "Follow Up", value: scores.followUp },
    { area: "Automation", value: scores.automation },
    { area: "Clarity", value: scores.clarity },
  ];
}

function barDataFromScores(scores: ReportData["scores"]) {
  return [
    { name: "Capture", score: scores.capture },
    { name: "Trust", score: scores.trust },
    { name: "Speed", score: scores.speed },
    { name: "Follow Up", score: scores.followUp },
    { name: "Automation", score: scores.automation },
    { name: "Clarity", score: scores.clarity },
  ];
}

function scoreTone(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Moderate";
  return "Needs work";
}

function riskTone(score: number) {
  if (score >= 80) return "Low leakage risk";
  if (score >= 65) return "Manageable leakage risk";
  if (score >= 50) return "Moderate leakage risk";
  return "High leakage risk";
}

function metricIcon(key: keyof ReportData["scores"]) {
  switch (key) {
    case "capture":
      return Globe;
    case "trust":
      return ShieldAlert;
    case "speed":
      return Clock3;
    case "followUp":
      return Users;
    case "automation":
      return Sparkles;
    case "clarity":
      return Radar;
    default:
      return TrendingUp;
  }
}

function channelBadge(channel: string) {
  const normalized = channel.toLowerCase();
  if (normalized.includes("email")) return { label: "Email", icon: Mail };
  if (normalized.includes("phone")) return { label: "Phone", icon: Phone };
  if (normalized.includes("booking")) return { label: "Booking", icon: CheckCircle2 };
  return { label: "Website Form", icon: FileText };
}

function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="mb-3 text-sm font-medium text-slate-300">{title}</div>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <h2 className="mb-5 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-white/80" style={{ width: `${value}%` }} />
    </div>
  );
}

function BadgePill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success";
}) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/20 text-emerald-300"
      : "bg-white/10 text-slate-200";
  return <span className={`rounded-full px-3 py-1 text-sm ${classes}`}>{children}</span>;
}

export default function Page() {
  const [report, setReport] = useState<ReportData>(mockReport);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const identifier = getReportIdentifier();

        if (!supabase) {
          setLoadError("Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
          setLoading(false);
          return;
        }

        if (!identifier) {
          setLoadError("Missing report identifier in the URL. Use /audit/{submission_id} or add ?submission_id=... .");
          setLoading(false);
          return;
        }

        let submission: AuditSubmissionRow | null = null;
        let reportRow: AuditReportRow | null = null;

        const { data: submissionDirect } = await supabase
          .from("audit_submissions")
          .select("id,business_id,status,submission_source,created_at")
          .eq("id", identifier)
          .maybeSingle();

        if (submissionDirect) {
          submission = submissionDirect as AuditSubmissionRow;
        } else {
          const { data: reportDirect } = await supabase
            .from("audit_reports")
            .select("id,submission_id,executive_summary,engagement_flow_map,lead_leakage_summary,created_at")
            .eq("id", identifier)
            .maybeSingle();

          if (reportDirect) {
            reportRow = reportDirect as AuditReportRow;
            const { data: linkedSubmission } = await supabase
              .from("audit_submissions")
              .select("id,business_id,status,submission_source,created_at")
              .eq("id", reportDirect.submission_id)
              .maybeSingle();
            submission = (linkedSubmission as AuditSubmissionRow | null) || null;
          }
        }

        if (!submission) {
          setLoadError("No matching audit submission or audit report was found for this URL.");
          setLoading(false);
          return;
        }

        if (!reportRow) {
          const { data: linkedReport } = await supabase
            .from("audit_reports")
            .select("id,submission_id,executive_summary,engagement_flow_map,lead_leakage_summary,created_at")
            .eq("submission_id", submission.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          reportRow = (linkedReport as AuditReportRow | null) || null;
        }

        const [{ data: business }, { data: questionnaire }, { data: scan }] = await Promise.all([
          supabase
            .from("businesses")
            .select("id,business_name,website_url")
            .eq("id", submission.business_id)
            .maybeSingle(),
          supabase
            .from("audit_questionnaire_answers")
            .select("id,submission_id,responses,additional_notes,enquiry_channels,response_time,after_hours_coverage")
            .eq("submission_id", submission.id)
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("website_scans")
            .select("id,business_id,website_url,scan_status,created_at,scan_started_at,scan_completed_at")
            .eq("business_id", submission.business_id)
            .order("scan_started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        let pages: ScanPageRow[] = [];
        let findings: FindingRow[] = [];

        if (scan?.id) {
          const { data: pageRows } = await supabase
            .from("website_scan_pages")
            .select("id,scan_id,page_url,page_title,http_status")
            .eq("scan_id", scan.id)
            .order("id", { ascending: true });

          pages = (pageRows as ScanPageRow[] | null) || [];

          const pageIds = pages.map((p) => p.id).filter(Boolean);
          if (pageIds.length > 0) {
            const { data: findingRows } = await supabase
              .from("website_scan_findings")
              .select("id,page_id,finding_type,finding_value,finding_context")
              .in("page_id", pageIds);

            findings = (findingRows as FindingRow[] | null) || [];
          }
        }

        setReport(
          buildReportData({
            business: (business as BusinessRow | null) || null,
            report: reportRow,
            submission,
            questionnaire: (questionnaire as QuestionnaireRow | null) || null,
            scan: (scan as ScanRow | null) || null,
            pages,
            findings,
          }),
        );
        setLoadError("");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load audit report.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const radarData = useMemo(() => radarDataFromScores(report.scores), [report]);
  const barData = useMemo(() => barDataFromScores(report.scores), [report]);

  const topIssues = useMemo(() => {
    return Object.entries(report.scores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);
  }, [report]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-10">
        {loading && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Loading live audit report from Supabase...
          </div>
        )}

        {loadError && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <div className="mb-4 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <BadgePill tone="success">Audit Complete</BadgePill>
                <BadgePill>{report.pagesScanned} pages scanned</BadgePill>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  {report.companyName} Audit Report
                </h1>
                <p className="mt-2 text-sm text-slate-300 md:text-base">
                  {report.websiteUrl} · Generated {report.generatedAt}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center rounded-2xl bg-white px-4 py-3 text-slate-950 hover:bg-slate-200">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </button>
              <button className="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white hover:bg-white/10">
                Book Strategy Call
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Overall AI Readiness">
            <div className="text-5xl font-semibold">{report.overallScore}</div>
            <div className="mt-2 text-sm text-slate-300">{scoreTone(report.overallScore)}</div>
            <ProgressBar value={report.overallScore} />
          </StatCard>

          <StatCard title="Lead Leakage Risk">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-9 w-9 text-amber-300" />
              <div>
                <div className="text-2xl font-semibold">{riskTone(report.overallScore)}</div>
                <div className="text-sm text-slate-300">Based on capture, speed and follow-up coverage</div>
              </div>
            </div>
          </StatCard>

          <StatCard title="Response Coverage">
            <div className="text-2xl font-semibold capitalize">{report.afterHoursCoverage}</div>
            <div className="mt-2 text-sm text-slate-300">Response time currently shown as {report.responseTime}</div>
          </StatCard>

          <StatCard title="Channels Detected">
            <div className="flex flex-wrap gap-2">
              {report.channels.map((channel) => {
                const meta = channelBadge(channel);
                const Icon = meta.icon;
                return (
                  <div
                    key={channel}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </StatCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Executive Summary">
              <div className="space-y-5 text-slate-200">
                <p className="leading-7">{report.executiveSummary}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-300">Engagement Flow</div>
                    <p className="text-sm leading-6 text-slate-200">{report.engagementFlowMap}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-300">Lead Leakage Summary</div>
                    <p className="text-sm leading-6 text-slate-200">{report.leadLeakageSummary}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Score Breakdown">
              <div className="mb-6 h-[320px] w-full rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                    <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.7)" />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 16,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="score" radius={[10, 10, 0, 0]} fill="rgba(255,255,255,0.75)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(report.scores).map(([key, value]) => {
                  const Icon = metricIcon(key as keyof ReportData["scores"]);
                  return (
                    <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium capitalize text-slate-200">
                          <Icon className="h-4 w-4" />
                          {key}
                        </div>
                        <div className="text-sm text-slate-300">{value}/100</div>
                      </div>
                      <ProgressBar value={value} />
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Top Automation Opportunities">
              <div className="grid gap-3">
                {report.topOpportunities.map((item, idx) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                      {idx + 1}
                    </div>
                    <div className="text-sm leading-6 text-slate-200">{item}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Radar Snapshot">
              <div className="h-[320px] w-full rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="area" stroke="rgba(255,255,255,0.7)" />
                    <PolarRadiusAxis domain={[0, 100]} stroke="rgba(255,255,255,0.25)" />
                    <RechartsRadar
                      name="Score"
                      dataKey="value"
                      stroke="rgba(255,255,255,0.9)"
                      fill="rgba(255,255,255,0.35)"
                      fillOpacity={0.8}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Highest Risk Areas">
              <div className="space-y-3">
                {topIssues.map(([key, value]) => {
                  const Icon = metricIcon(key as keyof ReportData["scores"]);
                  return (
                    <div key={key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/10 p-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-sm text-slate-300">Priority improvement area</div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold">{value}</div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Detected Findings">
              <div className="space-y-3">
                {report.findings.map((finding, idx) => {
                  const isEmail = finding.type === "email_address";
                  const isPhone = finding.type === "phone_number";
                  const isBooking = finding.type === "booking_widget";
                  const Icon = isEmail ? Mail : isPhone ? Phone : isBooking ? CheckCircle2 : Wrench;
                  return (
                    <div key={`${finding.type}-${finding.value}-${idx}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                        <Icon className="h-4 w-4" />
                        {finding.type.replaceAll("_", " ")}
                      </div>
                      <div className="text-base font-medium">{finding.value}</div>
                      <div className="mt-1 text-sm text-slate-300">{finding.context}</div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Pages Scanned">
              <div className="space-y-3">
                {report.pages.map((page) => (
                  <div key={page.url} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <div className="truncate font-medium">{page.title || "Untitled page"}</div>
                      <BadgePill tone="success">{page.status}</BadgePill>
                    </div>
                    <div className="truncate text-sm text-slate-300">{page.url}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}