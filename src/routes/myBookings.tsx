import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import {StatusBadge} from "@/components/StatusBadge";
import { useMyBookings, useRooms } from "@/lib/queries";

// this page was made to show the bookings for the correct user to give them feedback on all their bookings
export const Route = createFileRoute('/myBookings')({
  head: () => ({ meta: [{ title: "My Bookings— Roomly" }],}),
  component: MyBookingsPage,
})

function MyBookingsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const { data: rooms = [] } = useRooms();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading your bookings…</div>;
  }

  return (
     <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your bookings together with their status.
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No bookings to show.
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const room = rooms.find((r) => r.id === b.roomId);
            return (
              <Card key={b.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.title}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {room?.name ?? "Unknown room"} · {format(new Date(b.start), "d MMM, HH:mm")}–
                    {format(new Date(b.end), "HH:mm")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}