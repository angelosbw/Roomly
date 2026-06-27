import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/labels";
import type { BookingStatus } from "@/lib/types";

const STATUS_VARIANTS: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  pending: "secondary",
  rejected: "destructive",
  cancelled: "outline",
};
  
  export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}