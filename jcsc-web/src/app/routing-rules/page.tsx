import { MainLayout } from "@/components/layout/main-layout";
import { RoutingRulesContent } from "@/components/admin/routing-rules-content";

export default function RoutingRulesPage() {
  return (
    <MainLayout title="قواعد التوجيه">
      <RoutingRulesContent />
    </MainLayout>
  );
}
