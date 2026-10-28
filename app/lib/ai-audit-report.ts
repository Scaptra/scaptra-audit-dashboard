
/**
 * Scaptra AI Audit Report Writer
 *
 * Generates business-specific audit reports using
 * verified website scan findings.
 *
 * Safeguards:
 * - Do not invent website findings.
 * - Do not claim unverified revenue losses.
 * - Do not assume internal business processes.
 * - Clearly identify scan limitations.
 */

export type AuditEvidence = {
  businessName: string;
  website: string;
  scannedPages: number;
  findings: string[];
  limitedScan: boolean;
};

export type AiAuditReport = {
  executiveSummary: string;
  customerJourney: string;
  opportunities: {
    title: string;
    description: string;
    evidence: string[];
  }[];
  recommendedNextSteps: string[];
};



export function validateAuditReport(
  report: AiAuditReport,
  source: AuditEvidence
): boolean {
  if (
    !report ||
    !Array.isArray(report.opportunities) ||
    !Array.isArray(report.recommendedNextSteps)
  ) {
    return false;
  }

  const verifiedFindings = new Set(source.findings);

  return report.opportunities.every((opportunity) => {
    return (
      typeof opportunity.title === "string" &&
      typeof opportunity.description === "string" &&
      Array.isArray(opportunity.evidence) &&
      opportunity.evidence.length > 0 &&
      opportunity.evidence.every(
        (finding) =>
          typeof finding === "string" &&
          verifiedFindings.has(finding)
      )
    );
  });
}
