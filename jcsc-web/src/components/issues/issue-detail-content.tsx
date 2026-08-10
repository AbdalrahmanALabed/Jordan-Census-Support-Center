import { TicketDetailContent } from "@/components/tickets/ticket-detail-content";

export function IssueDetailContent({ issueId }: { issueId: string }) {
  return <TicketDetailContent ticketId={issueId} />;
}
