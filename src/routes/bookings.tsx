import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useBookingMutations, useBookings, useRooms, useUsers } from "@/lib/queries";
import type { Booking, Room, User } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";

interface SearchParams {
  roomId?: string;
}

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [{ title: "Bookings — Roomly" }],
  }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    roomId: typeof s.roomId === "string" ? s.roomId : undefined,
  }),
  component: BookingsPage,
});

const DAY_START = 8;
const DAY_END = 19;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const SLOT_HEIGHT = 56;

function canModifyBooking(user: User, booking: Booking, room: Room | undefined) {
  if (booking.userId === user.id) return true;
  if (user.role === "admin") return true;
  if (user.role === "office_manager" && room && user.managedOffice === room.office) return true;
  return false;
}

function BookingsPage() {
  const { user } = useAuth();
  const { roomId: prefRoom } = Route.useSearch();
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [roomFilter, setRoomFilter] = useState<string | undefined>(prefRoom);
  const [editing, setEditing] = useState<{
    booking?: Booking;
    defaultStart?: Date;
    defaultRoom?: string;
  } | null>(prefRoom ? { defaultRoom: prefRoom } : null);

  const activeRoomId = roomFilter ?? rooms[0]?.id;
  const weekEnd = endOfDay(addDays(weekStart, 4));

  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(
    activeRoomId
      ? {
          roomId: activeRoomId,
          from: startOfDay(weekStart).toISOString(),
          to: weekEnd.toISOString(),
        }
      : undefined,
  );

  const { data: users = [] } = useUsers();
  const { createBooking, updateBooking, cancelBooking } = useBookingMutations();

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const room = rooms.find((r) => r.id === activeRoomId);

  if (roomsLoading || bookingsLoading) {
    return <div className="text-sm text-muted-foreground">Loading bookings…</div>;
  }

  if (!user || !room) {
    return <div className="text-sm text-muted-foreground">No rooms available.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 4), "d MMM yyyy")} · {room.name} ·{" "}
            {room.office}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeRoomId} onValueChange={setRoomFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} — {r.office}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button onClick={() => setEditing({ defaultRoom: activeRoomId })} className="gap-1.5">
            <Plus className="size-4" /> New
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b bg-muted/30">
          <div />
          {days.map((d) => (
            <div key={+d} className="p-3 text-center border-l">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {format(d, "EEE")}
              </div>
              <div
                className={`text-lg font-semibold mt-0.5 ${isSameDay(d, new Date()) ? "text-primary" : ""}`}
              >
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[64px_repeat(5,1fr)] relative">
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: SLOT_HEIGHT }}
                className="text-[11px] text-muted-foreground pr-2 text-right pt-1 border-b"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((d) => (
            <div key={+d} className="relative border-l">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: SLOT_HEIGHT }}
                  className="border-b hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() => {
                    const dt = new Date(d);
                    dt.setHours(h, 0, 0, 0);
                    setEditing({ defaultStart: dt, defaultRoom: activeRoomId });
                  }}
                />
              ))}
              {bookings
                .filter((b) => isSameDay(new Date(b.start), d))
                .filter((b) => b.status === "confirmed" || b.status === "pending")//added this filted so that the pending bookings are also shown on the calendar, as per phase 1 requirement
                .map((b) => {
                  const start = new Date(b.start);
                  const end = new Date(b.end);
                  const top = (start.getHours() + start.getMinutes() / 60 - DAY_START) * SLOT_HEIGHT;
                  const height = (differenceInMinutes(end, start) / 60) * SLOT_HEIGHT;
                  const bookingUser = users.find((u) => u.id === b.userId);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing({ booking: b });
                      }}
                      style={{ top, height }}
                     className={`absolute left-1 right-1 rounded-md text-left px-2 py-1.5 text-xs overflow-hidden shadow-sm border ${
                          b.status === "pending"
                            ? "bg-background border-dashed border-primary text-foreground"
                            : "bg-primary/90 hover:bg-primary text-primary-foreground border-primary"
                        }`}>
                      <div className="font-medium truncate">{b.title}</div>
                      <div className="opacity-90 truncate">
                        {format(start, "HH:mm")}–{format(end, "HH:mm")} · {bookingUser?.name}
                      </div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </Card>

      {editing && (
        <BookingDialog
          key={editing.booking?.id ?? "new"}
          booking={editing.booking}
          defaultStart={editing.defaultStart}
          defaultRoom={editing.defaultRoom ?? activeRoomId}
          canModify={
            !editing.booking || canModifyBooking(user, editing.booking, room)
          }
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            try {
              if (editing.booking) {
                await updateBooking.mutateAsync({ id: editing.booking.id, ...data });
                toast.success("Booking updated");
              } else {
                await createBooking.mutateAsync(data);
                toast.success("Booking created");
              }
              setEditing(null);
            } catch (err) {
              toast.error(err instanceof ApiClientError ? err.message : "Failed");
            }
          }}
          onCancel={async () => {
            if (!editing.booking) return;
            try {
              await cancelBooking.mutateAsync(editing.booking.id);
              toast.success("Booking cancelled");
              setEditing(null);
            } catch (err) {
              toast.error(err instanceof ApiClientError ? err.message : "Failed");
            }
          }}
        />
      )}
    </div>
  );
}

interface DialogData {
  roomId: string;
  title: string;
  start: string;
  end: string;
  attendees: number;
}

function BookingDialog({
  booking,
  defaultStart,
  defaultRoom,
  canModify,
  onClose,
  onSubmit,
  onCancel,
}: {
  booking?: Booking;
  defaultStart?: Date;
  defaultRoom: string;
  canModify: boolean;
  onClose: () => void;
  onSubmit: (d: DialogData) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}) {
  const { data: rooms = [] } = useRooms();
  const initStart = booking ? new Date(booking.start) : (defaultStart ?? new Date());
  const initEnd = booking ? new Date(booking.end) : addMinutes(initStart, 60);

  const [roomId, setRoomId] = useState(booking?.roomId ?? defaultRoom);
  const [title, setTitle] = useState(booking?.title ?? "");
  const [date, setDate] = useState(format(initStart, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(initStart, "HH:mm"));
  const [endTime, setEndTime] = useState(format(initEnd, "HH:mm"));
  const [attendees, setAttendees] = useState(booking?.attendees ?? 2);

  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            {canModify
              ? "Pick a room, time, and number of attendees."
              : "You can view this booking but only the owner or a manager can edit it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canModify}
              placeholder="Team sync"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId} disabled={!canModify}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {r.office} (cap. {r.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3 sm:col-span-1">
              <Label htmlFor="d">Date</Label>
              <Input
                id="d"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!canModify}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s">Start</Label>
              <Input
                id="s"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canModify}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e">End</Label>
              <Input
                id="e"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canModify}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att">Attendees (max {room?.capacity ?? "—"})</Label>
            <Input
              id="att"
              type="number"
              min={1}
              max={room?.capacity}
              value={attendees}
              onChange={(e) => setAttendees(Math.max(1, Number(e.target.value) || 1))}
              disabled={!canModify}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-row justify-between">
          <div>
            {booking && canModify && (
              <Button variant="destructive" type="button" onClick={onCancel}>
                Cancel booking
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
            {canModify && (
              <Button
                type="button"
                onClick={() => {
                  if (!title.trim()) {
                    toast.error("Please add a title");
                    return;
                  }
                  void onSubmit({
                    roomId,
                    title: title.trim(),
                    start: new Date(`${date}T${startTime}:00`).toISOString(),
                    end: new Date(`${date}T${endTime}:00`).toISOString(),
                    attendees,
                  });
                }}
              >
                {booking ? "Save" : "Create"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
