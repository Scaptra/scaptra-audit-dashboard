
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
