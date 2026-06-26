import { addDays, addHours, setHours, setMinutes, startOfDay } from "date-fns";
import type { Booking, Room, User } from "../shared/types";
import { writeBookings, writeRooms, writeUsers } from "./storage";
import usersJson from "../data/users.json";
import roomsJson from "../data/rooms.json";//changed two rooms as per phase 1 requirement.

const users = usersJson as User[];
const rooms = roomsJson as Room[];

function seedBookings(): Booking[] {
  const today = startOfDay(new Date());
  const at = (d: Date, h: number, m = 0) => setMinutes(setHours(d, h), m).toISOString();
  const mk = (
    id: string,
    roomId: string,
    userId: string,
    title: string,
    dayOffset: number,
    startH: number,
    endH: number,
    status: Booking["status"] = "confirmed",
    attendees = 4,
  ): Booking => {
    const day = addDays(today, dayOffset);
    return {
      id,
      roomId,
      userId,
      title,
      start: at(day, startH),
      end: at(day, endH),
      status,
      attendees,
      createdAt: addHours(day, -48).toISOString(),
      cancelledAt: status === "cancelled" ? addHours(day, -24).toISOString() : undefined,
    };
  };

  return [
    mk("b1", "r1", "u1", "Product sync", 0, 10, 11),
    mk("b2", "r3", "u2", "All-hands rehearsal", 0, 14, 16, "confirmed", 10),
    mk("b3", "r5", "u4", "Design crit", 1, 9, 10),
    mk("b4", "r6", "u3", "Board meeting", 2, 13, 15, "confirmed", 15),
    mk("b5", "r2", "u1", "1:1 with manager", 1, 15, 16),
    mk("b6", "r7", "u2", "Client demo", 3, 11, 12, "confirmed", 8),
    mk("b7", "r4", "u4", "Quick chat", -1, 10, 11, "cancelled"),
    mk("b8", "r1", "u3", "Engineering planning", -2, 9, 11, "cancelled", 6),
    mk("b9", "r8", "u1", "Vendor call", 4, 14, 15),
    mk("b10", "r2", "u1", "Strategy session", 1, 10, 11, "rejected"),
  ];
}

export async function seedDatabase() {
  await writeUsers(users);
  await writeRooms(rooms);
  await writeBookings(seedBookings());
}

const isMain = process.argv[1]?.endsWith("seed.ts");
if (isMain) {
  await seedDatabase();
  console.log("Database reset from seed data.");
}
