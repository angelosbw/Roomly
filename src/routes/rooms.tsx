import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useBookings, useRooms } from "@/lib/queries";
import { EQUIPMENT_LABELS } from "@/lib/labels";
import type { Equipment } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar, Lock, Monitor, PenSquare, Users, Video, Search } from "lucide-react";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [{ title: "Rooms — Roomly" }],
  }),
  component: RoomsPage,
});

const PAGE_SIZE = 3;

const EQUIPMENT_ICON: Record<Equipment, typeof Monitor> = {
  projector: Monitor,
  whiteboard: PenSquare,
  video_conferencing: Video,
};

function RoomBookingCount({ count }: { count: number }) {
  //took off the call for each room and instead put it on the parent method to call once for all rooms, therefore not creating latency when loading rooms when there are loads of bookings
  
  return (
    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
      <Calendar className="size-3" />
      {`${count} active booking${count === 1 ? "" : "s"}`}
    </p>
  );
}

function RoomsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [office, setOffice] = useState<string>("all");
  const [minCap, setMinCap] = useState<string>("any");
  const [equip, setEquip] = useState<Set<Equipment>>(new Set());
  const [page, setPage] = useState(1); //page state

  const equipment = useMemo(() => Array.from(equip), [equip]);
  
  useEffect(() => {
    setPage(1);
  }, [q, office, minCap, equipment]);

  const { data: rooms = [], isLoading } = useRooms({
    q: q || undefined,
    office: office !== "all" ? office : undefined,
    minCapacity: minCap !== "any" ? minCap : undefined,
    equipment: equipment.length ? equipment : undefined,
  });
  const { data: allbookings = []} = useBookings();
  const { data: allRooms = [] } = useRooms();

  const offices = useMemo(
    () => Array.from(new Set(allRooms.map((r) => r.office))).sort(),
    [allRooms],
  );

  const bookingCounts = useMemo(() => {
    const counts: Record<string, number> = {};//empty ibject
    for (const b of allbookings) {//for each booking in the booking list
      if (b.status === "cancelled") continue;   // skip cancelled, matching the original that was there
      counts[b.roomId] = (counts[b.roomId] ?? 0) + 1;//takes the current count of that room and adds 1, or if it wasn't set before, it sets it to 0 then adds 1
    }
    return counts;
  }, [allbookings]);//makes this happen only when allbookings changes, otherwise it doesnt make it happen on every render

  const totalPages = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE));
  const pagedRooms = rooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleEquip = (e: Equipment) => {
    setEquip((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rooms.length} of {allRooms.length} rooms
            {rooms.length > PAGE_SIZE && (
              <>
                {" "}
                · page {page} of {totalPages}
              </>
            )}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid md:grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="q" className="text-xs">
              Search
            </Label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Room name"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Office</Label>
            <Select value={office} onValueChange={setOffice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Min. capacity</Label>
            <Select value={minCap} onValueChange={setMinCap}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {[2, 4, 6, 8, 12, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 items-center pb-2">
            {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
              <label key={e} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={equip.has(e)} onCheckedChange={() => toggleEquip(e)} />
                {EQUIPMENT_LABELS[e]}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rooms…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedRooms.map((r) => (
              <Card key={r.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg leading-none">{r.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5">{r.office}</p>
                    {r.requiresApproval && (
                      <Badge variant="outline" className="mt-2 gap-1">
                        <Lock className="size-3" /> Approval required
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="size-3" /> {r.capacity}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 min-h-[28px]">
                  {r.equipment.map((e) => {
                    const Icon = EQUIPMENT_ICON[e];
                    return (
                      <span
                        key={e}
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted"
                      >
                        <Icon className="size-3" /> {EQUIPMENT_LABELS[e]}
                      </span>
                    );
                  })}
                  {r.equipment.length === 0 && (
                    <span className="text-xs text-muted-foreground">No equipment</span>
                  )}
                </div>
                <RoomBookingCount count={bookingCounts[r.id] ?? 0 } />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-5"
                  onClick={() => navigate({ to: "/bookings", search: { roomId: r.id } })}
                >
                  Book this room
                </Button>
              </Card>
            ))}
            {rooms.length === 0 && (
              <Card className="p-8 col-span-full text-center text-sm text-muted-foreground">
                No rooms match those filters.
              </Card>
            )}
            {rooms.length > 0 && pagedRooms.length === 0 && (
              <Card className="p-8 col-span-full text-center text-sm text-muted-foreground">
                No rooms on this page. Try going back to page 1.
              </Card>
            )}
          </div>

          {rooms.length > PAGE_SIZE && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
