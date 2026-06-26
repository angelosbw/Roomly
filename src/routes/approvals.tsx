import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { usePendingBookings, useBookingMutations, useRooms } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";

// this page was made to show the pending bookings for the correct user to approve or reject bookings
export const Route = createFileRoute('/approvals')({
  head: () => ({ meta: [{ title: "Approvals — Roomly" }],}),
  component: ApprovalsPage,
})

function ApprovalsPage() {
  const {data: pending = [], isLoading } = usePendingBookings();
  const {data: rooms = []} = useRooms();
  const { approveBooking, rejectBooking } = useBookingMutations();

  if(isLoading) {
    return <div>Loading Approvals</div>;
  }

  return (
     <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bookings waiting for your approval.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No pending bookings to approve.
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((b) => {
            const room = rooms.find((r) => r.id === b.roomId);
            return (
              <Card key={b.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {room?.name ?? "Unknown room"} · {format(new Date(b.start), "d MMM, HH:mm")}–
                    {format(new Date(b.end), "HH:mm")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await rejectBooking.mutateAsync(b.id);
                        toast.success("Booking rejected");
                      } catch (err) {
                        toast.error(err instanceof ApiClientError ? err.message : "Failed");
                      }
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await approveBooking.mutateAsync(b.id);
                        toast.success("Booking approved");
                      } catch (err) {
                        toast.error(err instanceof ApiClientError ? err.message : "Failed");
                      }
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}