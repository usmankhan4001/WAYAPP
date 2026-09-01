/**
 * CRM lead pipeline stages — single source of truth.
 * Previously duplicated (and subtly divergent) in contacts/page.tsx and
 * inbox/ChatWindow.tsx. `tone` maps to <StatusBadge> / semantic status colors.
 */

export type LeadStageId =
  | "NEW_LEAD"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

export type LeadStageTone = "info" | "warning" | "accent" | "brand" | "success" | "destructive";

export interface LeadStage {
  id: LeadStageId;
  label: string;
  /** semantic tone for <StatusBadge tone> */
  tone: LeadStageTone;
}

export const LEAD_STAGES: readonly LeadStage[] = [
  { id: "NEW_LEAD", label: "New Lead", tone: "info" },
  { id: "CONTACTED", label: "Contacted", tone: "warning" },
  { id: "QUALIFIED", label: "Qualified", tone: "accent" },
  { id: "PROPOSAL_SENT", label: "Proposal Sent", tone: "brand" },
  { id: "WON", label: "Deal Won", tone: "success" },
  { id: "LOST", label: "Deal Lost", tone: "destructive" },
] as const;

export const DEFAULT_LEAD_STAGE = LEAD_STAGES[0];

export function getLeadStage(id: string | null | undefined): LeadStage {
  return LEAD_STAGES.find((s) => s.id === id) ?? DEFAULT_LEAD_STAGE;
}
