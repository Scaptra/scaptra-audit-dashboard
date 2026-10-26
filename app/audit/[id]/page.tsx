import { createClient } from "@supabase/supabase-js";
import RequestFullReportButton from "./RequestFullReportButton";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BOOKING_URL =
  "https://api.leadconnectorhq.com/widget/booking/a9PnMq5n6AtbQvx4YDVN";

type Opportunity = { title: string; description: string };

function scoreLabel(score: number) {
  if (score >= 85) return "Strong foundation";
  if (score >= 70) return "Good foundation, room to improve";
  if (score >= 50) return "Some improvements recommended";
  return "Important improvements recommended";
}

function shortDescription(score: number) {
  if (score >= 85)
    return "Your website has a strong foundation. A few refinements could make enquiries easier to manage.";
  if (score >= 70)
    return "Your website is doing some things well, with opportunities to make customer enquiries easier.";
  return "There may be opportunities to make it easier for visitors to contact your business.";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOpportunities(report: any, scoreRow: any, limited: boolean): Opportunity[] {
  if (limited) {
    return [
      { title: "Review the customer journey", description: "Check how visitors find the right way to contact you." },
      { title: "Check enquiry responses", description: "Confirm what happens when a customer contacts you after hours." },
      { title: "Review follow-up", description: "Make sure every enquiry has a clear next step." },
    ];
  }

  const notes = scoreRow?.scoring_notes?.audit_summary;
  const detected: Opportunity[] = [];
  if ((notes?.pages_with_no_buttons ?? 0) > 0) {
    detected.push({
      title: "Make the next step clearer",
      description: "Some scanned pages may need a more obvious way to enquire.",
    });
  }
  if ((notes?.pages_with_no_forms ?? 0) > 0) {
    detected.push({
      title: "Make enquiries easier",
      description: "Consider a clear contact or quote link on relevant pages.",
    });
  }

  const matrix = report?.automation_opportunity_matrix;
  if (matrix && typeof matrix === "object" && !Array.isArray(matrix)) {
    for (const item of Object.values(matrix) as any[]) {
      const title = typeof item === "string" ? "Improvement opportunity" : cleanText(item?.title);
      const description = typeof item === "string" ? item : cleanText(item?.description);
     if (title && description && !detected.some((entry) => entry.title === title || (entry.title === "Make the next step clearer" && title === "Make action points more obvious"))) {
        detected.push({ title, description });
      }
    }
  }

  // These are suggestions to verify with the business, not confirmed failures.
  const suggestions: Opportunity[] = [
    { title: "Check response times", description: "Confirm how quickly new enquiries receive a reply." },
    { title: "Review follow-up", description: "Make sure interested customers have a clear next step." },
    { title: "Simplify customer contact", description: "Help visitors reach the right person with less effort." },
  ];
  for (const suggestion of suggestions) {
    if (detected.length >= 3) break;
    if (!detected.some((entry) => entry.title === suggestion.title)) detected.push(suggestion);
  }
  return detected.slice(0, 3).map((item) => ({
    title: item.title,
    description: item.description.length > 145 ? `${item.description.slice(0, 142)}…` : item.description,
  }));
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: report, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-3 text-slate-300">This audit may still be processing, or the link may be incorrect.</p>
      </main>
    );
  }

  let business: any = null;
  let scoreRow: any = null;
  if (report.submission_id) {
    const { data: submission } = await supabase
      .from("audit_submissions")
      .select("*")
      .eq("id", report.submission_id)
      .single();
    const { data: scoreData } = await supabase
      .from("audit_scores")
      .select("*")
      .eq("submission_id", report.submission_id)
      .single();
    scoreRow = scoreData;
    if (submission?.business_id) {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", submission.business_id)
        .single();
      business = businessData;
    }
  }

  const name = business?.business_name || report.business_name || "Your business";
  const website = business?.website || report.website || "";
  const limited = scoreRow?.scoring_notes?.limited_scan === true;
  const rawScore = scoreRow?.total_score ?? report.total_score;
  const score = typeof rawScore === "number" && Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : null;
  const opportunities = getOpportunities(report, scoreRow, limited);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:p-8">
        <div className="text-xs font-bold uppercase tracking-widest text-sky-400">
          Scaptra · Digital Engagement Snapshot
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{name}</h1>
        {website && <p className="mt-1 break-all text-sm text-slate-400">{website.replace(/^https?:\/\//i, "")}</p>}

        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
          <div className="shrink-0 text-center sm:w-32">
            <div className="text-4xl font-extrabold text-sky-400">
              {limited || score === null ? "—" : score}
            </div>
            <div className="text-xs text-slate-400">
              {limited ? "Limited scan" : score === null ? "Score unavailable" : "out of 100"}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {limited ? "A closer look is needed" : score === null ? "Your audit is ready for review" : scoreLabel(score)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {limited
                ? "Website protection limited the automated review. We recommend checking the customer journey manually."
                : score === null
                  ? "We could not confirm a reliable overall score from this scan."
                  : shortDescription(score)}
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-lg font-bold">Three opportunities worth reviewing</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {opportunities.map((item, index) => (
            <div key={index} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <div className="mb-2 text-xs font-bold text-sky-400">0{index + 1}</div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-sky-800 bg-slate-950/70 p-5 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-sky-400">
            Your next step
          </div>
          <h2 className="mt-2 text-xl font-bold">Get the full picture</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Receive your free detailed audit findings and practical recommendations by email.
            No cost or obligation.
          </p>

         
<RequestFullReportButton reportId={id} />


          <div className="mt-5 border-t border-slate-700 pt-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm text-slate-300">
              Prefer to talk it through? Book a free 15-minute walkthrough.
            </p>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block shrink-0 rounded-xl border border-sky-400 px-5 py-3 text-center text-sm font-semibold text-sky-300 hover:bg-sky-400/10 sm:mt-0"
            >
              Book a free walkthrough
            </a>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          This snapshot is based on publicly visible website information. Recommendations are opportunities to investigate, not proof of missed enquiries or lost revenue.
        </p>
      </div>
    </main>
  );
}
