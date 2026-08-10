import { redirect } from "next/navigation";

export default async function TicketDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/issues/${id}`);
}
