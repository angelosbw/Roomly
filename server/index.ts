import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Booking, Equipment, User } from "../shared/types";
import { readBookings, readRooms, readUsers, updateBookings } from "./storage";
import {
  canModifyBooking,
  canApproveBooking,
  findConflict,
  validateBookingTimes,
  validateCapacity,
} from "./bookings-logic";

type AppEnv = {
  Variables: {
    user: User;
  };
};

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

function publicUser(user: User): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    managedOffice: user.managedOffice,
  };
}

async function findUserById(userId: string) {
  const users = await readUsers();
  return users.find((user) => user.id === userId) ?? null;
}

const authed = new Hono<AppEnv>();

authed.use("*", async (c, next) => {
  const userId = getCookie(c, "userId");
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const user = await findUserById(userId);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/users", async (c) => {
  const users = await readUsers();
  return c.json({ users: users.map(publicUser) });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim();
  if (!email) return c.json({ error: "Email is required" }, 400);

  const users = await readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return c.json({ error: "No user with that email" }, 401);

  setCookie(c, "userId", user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (c) => {
  deleteCookie(c, "userId", { path: "/" });
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const userId = getCookie(c, "userId");
  if (!userId) return c.json({ user: null });
  const user = await findUserById(userId);
  if (!user) return c.json({ user: null });
  return c.json({ user: publicUser(user) });
});

app.get("/api/rooms", async (c) => {
  const q = c.req.query("q")?.toLowerCase();
  const office = c.req.query("office");
  const minCapacity = c.req.query("minCapacity");
  const equipment = c.req.query("equipment");

  let rooms = await readRooms();

  if (q) rooms = rooms.filter((room) => room.name.toLowerCase().includes(q));
  if (office && office !== "all") rooms = rooms.filter((room) => room.office === office);
  if (minCapacity && minCapacity !== "any") {
    const min = Number(minCapacity);
    if (!Number.isNaN(min)) rooms = rooms.filter((room) => room.capacity >= min);
  }
  if (equipment) {
    const required = equipment.split(",").filter(Boolean) as Equipment[];
    rooms = rooms.filter((room) => required.every((item) => room.equipment.includes(item)));
  }

  return c.json({ rooms });
});

app.get("/api/rooms/:id", async (c) => {
  const rooms = await readRooms();
  const room = rooms.find((item) => item.id === c.req.param("id"));
  if (!room) return c.json({ error: "Room not found" }, 404);
  return c.json({ room });
});

app.get("/api/bookings", async (c) => {
  const roomId = c.req.query("roomId");
  const status = c.req.query("status");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let bookings = await readBookings();

  if (roomId) bookings = bookings.filter((booking) => booking.roomId === roomId);
  if (status) bookings = bookings.filter((booking) => booking.status === status);
  if (from) bookings = bookings.filter((booking) => new Date(booking.end) >= new Date(from));
  if (to) bookings = bookings.filter((booking) => new Date(booking.start) <= new Date(to));

  return c.json({ bookings });
});

authed.post("/bookings", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    roomId?: string;
    title?: string;
    start?: string;
    end?: string;
    attendees?: number;
  }>();

  const { roomId, title, start, end, attendees } = body;
  if (!roomId || !title?.trim() || !start || !end || attendees == null) {
    return c.json({ error: "roomId, title, start, end, and attendees are required" }, 400);
  }

  const timeError = validateBookingTimes(start, end);
  if (timeError) return c.json({ error: timeError }, 400);

  const rooms = await readRooms();
  const room = rooms.find((item) => item.id === roomId);
  if (!room) return c.json({ error: "Room not found" }, 404);// added this since later room is needed, and a booking cant be made on an unidentified room
  const capacityError = validateCapacity(attendees, room);
  if (capacityError) return c.json({ error: capacityError }, 400);

  const bookings = await readBookings();
  const conflict = findConflict(bookings, start, end, roomId);
  if (conflict) return c.json({ error: "Room is already booked for that time" }, 409);

  const booking: Booking = {
    id: "b" + crypto.randomUUID().slice(0, 8),
    roomId,
    userId: user.id,
    title: title.trim(),
    start,
    end,
    attendees,
    status:room.requiresApproval ? "pending" : "confirmed", //changed from hardcoded confirmed to checking if the room requires approval, if so then pending
    createdAt: new Date().toISOString(),
  };

  await updateBookings((current) => [...current, booking]);
  return c.json({ booking }, 201);
});

authed.patch("/bookings/:id", async (c) => {
  const user = c.get("user");
  const bookingId = c.req.param("id");
  const body = await c.req.json<Partial<Pick<Booking, "roomId" | "title" | "start" | "end" | "attendees">>>();

  const bookings = await readBookings();
  const existing = bookings.find((booking) => booking.id === bookingId);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const rooms = await readRooms();
  const existingRoom = rooms.find((room) => room.id === existing.roomId);
  if (!canModifyBooking(user, existing, existingRoom)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const merged = { ...existing, ...body };
  const timeError = validateBookingTimes(merged.start, merged.end);
  if (timeError) return c.json({ error: timeError }, 400);

  const room = rooms.find((item) => item.id === merged.roomId);
  const capacityError = validateCapacity(merged.attendees, room);
  if (capacityError) return c.json({ error: capacityError }, 400);

  const conflict = findConflict(bookings, merged.start, merged.end, merged.roomId, bookingId);
  if (conflict) return c.json({ error: "Room is already booked for that time" }, 409);

  let updated: Booking | undefined;
  await updateBookings((current) =>
    current.map((booking) => {
      if (booking.id !== bookingId) return booking;
      updated = merged;
      return merged;
    }),
  );

  return c.json({ booking: updated });
});

authed.post("/bookings/:id/approve", async (c) => {
  const user = c.get("user");// get user
  const bookingId = c.req.param("id"); //get booking id

  const bookings = await readBookings();//read bookings from storage
  const existing = bookings.find((booking) => booking.id === bookingId);//find the booking based on the id
  if (!existing) return c.json({ error: "Not found" }, 404);//if it doesnt exist say it isnt found

  const rooms = await readRooms();//read rooms from storage
  const existingRoom = rooms.find((room) => room.id === existing.roomId);//find room based on the id gathered
  
  //use method to see if the user can approve bookings
  if (!canApproveBooking(user, existingRoom)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  //can only approve if booking is pending
  if (existing.status !== "pending") {
    return c.json({ error: "Only pending bookings can be approved" }, 400);
  }
  //booking set to confirmed if all conditions before are met
  await updateBookings((current) =>
    current.map((booking) => {
      if (booking.id !== bookingId) return booking;
      return { ...booking, status: "confirmed" };//sending a new one rather than mutating old one since it might be in a shared state
    }),
  );
  return c.json({ ok: true });
});

authed.post("/bookings/:id/reject", async (c) => {
  const user = c.get("user");// get user
  const bookingId = c.req.param("id"); //get booking id

  const bookings = await readBookings();//read bookings from storage
  const existing = bookings.find((booking) => booking.id === bookingId);//find the booking based on the id
  if (!existing) return c.json({ error: "Not found" }, 404);//if it doesnt exist say it isnt found

  const rooms = await readRooms();//read rooms from storage
  const existingRoom = rooms.find((room) => room.id === existing.roomId);//find room based on the id gathered
  
  //use method to see if the user can reject bookings
  if (!canApproveBooking(user, existingRoom)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  //can only reject if booking is pending
  if (existing.status !== "pending") {
    return c.json({ error: "Only pending bookings can be rejected" }, 400);
  }
  
  //booking set to rejected if all conditions before are met
  
  await updateBookings((current) =>
    current.map((booking) => {
      if (booking.id !== bookingId) return booking;
      return { ...booking, status: "rejected" };//sending a new one rather than mutating old one since it might be in a shared state
    }),
  );
  return c.json({ ok: true });
});

authed.get("/bookings/pending", async (c) => {
  const bookingsToGive: Booking[] = [];
  const bookings = await readBookings();
  const rooms = await readRooms();
  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  for (const booking of pendingBookings) {
    const room = (rooms.find((room) => room.id === booking.roomId));
    if (canApproveBooking(c.get("user"), room)) {
      bookingsToGive.push(booking);
    }
  }
  return c.json({ bookings: bookingsToGive });
});
authed.post("/bookings/:id/cancel", async (c) => {
  const user = c.get("user");
  const bookingId = c.req.param("id");

  const bookings = await readBookings();
  const existing = bookings.find((booking) => booking.id === bookingId);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const rooms = await readRooms();
  const room = rooms.find((item) => item.id === existing.roomId);
  if (!canModifyBooking(user, existing, room)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  let updated: Booking | undefined;
  await updateBookings((current) =>
    current.map((booking) => {
      if (booking.id !== bookingId) return booking;
      updated = {
        ...booking,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      };
      return updated;
    }),
  );

  return c.json({ booking: updated });
});

app.route("/api", authed);

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

export { app };
