import type {
  TicketPriority,
  TicketStatus,
  ResearcherStatus,
  IssueStatus,
} from "@/lib/types";
import {
  PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  RESEARCHER_STATUS_LABELS,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const priorityVariant: Record<
  TicketPriority,
  "critical" | "warning" | "info" | "secondary"
> = {
  CRITICAL: "critical",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "secondary",
};

const statusVariant: Record<
  IssueStatus,
  "critical" | "warning" | "info" | "success" | "secondary"
> = {
  RECEIVED: "critical",
  ASSIGNED: "warning",
  IN_PROGRESS: "info",
  NEED_INFO: "warning",
  WAITING_DEPLOYMENT: "info",
  READY_FOR_TESTING: "success",
  RETURNED: "critical",
  CLOSED: "secondary",
};

const researcherVariant: Record<
  ResearcherStatus,
  "success" | "warning" | "critical"
> = {
  ACTIVE: "success",
  IDLE: "warning",
  NO_SYNC: "critical",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={priorityVariant[priority]}>{PRIORITY_LABELS[priority]}</Badge>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const label = ISSUE_STATUS_LABELS[status as IssueStatus] ?? status;
  const variant = statusVariant[status as IssueStatus] ?? "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <StatusBadge status={status} />;
}

export function ResearcherStatusBadge({ status }: { status: ResearcherStatus }) {
  return (
    <Badge variant={researcherVariant[status]}>
      {RESEARCHER_STATUS_LABELS[status]}
    </Badge>
  );
}
