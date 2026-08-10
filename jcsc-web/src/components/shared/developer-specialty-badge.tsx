import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSpecialtyBadgeClass, getSpecialtyLabel } from "@/lib/developer-specialties";
import type { User } from "@/lib/types";

export function DeveloperSpecialtyBadge({
  user,
  className,
}: {
  user: Pick<User, "role" | "team">;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-bold whitespace-nowrap", getSpecialtyBadgeClass(user), className)}
    >
      {getSpecialtyLabel(user)}
    </Badge>
  );
}
