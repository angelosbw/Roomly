import { describe, expect, it } from "vitest";
import type { Booking, Room, User } from "../shared/types";
import {
  canModifyBooking,
  canApproveBooking,
  findConflict,
  overlaps,
  validateBookingTimes,
  validateCapacity,
} from "./bookings-logic";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    roomId: "r1",
    userId: "u1",
    title: "Test meeting",
    start: "2026-06-23T10:00:00.000Z",
    end: "2026-06-23T11:00:00.000Z",
    status: "confirmed",
    attendees: 4,
    createdAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

const room = (overrides: Partial<Room> = {}): Room => ({
  id: "r1",
  name: "Aurora",
  capacity: 8,
  office: "London",
  equipment: [],
  ...overrides,
});

const user = (overrides: Partial<User> = {}): User => ({
  id: "u1",
  name: "Alex",
  email: "alex@acme.co",
  role: "employee",
  ...overrides,
});

describe("validateBookingTimes", () => {
  it("rejects end before or equal to start", () => {
    expect(validateBookingTimes("2026-06-23T11:00:00.000Z", "2026-06-23T10:00:00.000Z")).toBe(
      "End must be after start",
    );
    expect(validateBookingTimes("2026-06-23T10:00:00.000Z", "2026-06-23T10:00:00.000Z")).toBe(
      "End must be after start",
    );
  });

  it("accepts a valid range", () => {
    expect(validateBookingTimes("2026-06-23T10:00:00.000Z", "2026-06-23T11:00:00.000Z")).toBeNull();
  });
});

describe("validateCapacity", () => {
  it("rejects attendees above room capacity", () => {
    expect(validateCapacity(9, room())).toBe("Exceeds room capacity (8)");
  });
});

describe("overlaps", () => {
  it("blocks slots for a pending booking", () => {
    expect(
      overlaps(
        booking({ status: "pending" }),
        "2026-06-23T10:30:00.000Z",
        "2026-06-23T11:30:00.000Z",
        "r1",
      ),
    ).toBe(true);
  });

  it("ignores rejected bookings", () => {
    expect(
      overlaps(
        booking({ status: "rejected" }),
        "2026-06-23T10:30:00.000Z",
        "2026-06-23T1 1:30:00.000Z",
        "r1",
      ),
    ).toBe(false);
  });

  it("detects overlap with a confirmed booking", () => {
    expect(
      overlaps(
        booking(),
        "2026-06-23T10:30:00.000Z",
        "2026-06-23T11:30:00.000Z",
        "r1",
      ),
    ).toBe(true);
  });

  it("ignores cancelled bookings", () => {
    expect(
      overlaps(
        booking({ status: "cancelled" }),
        "2026-06-23T10:30:00.000Z",
        "2026-06-23T11:30:00.000Z",
        "r1",
      ),
    ).toBe(false);
  });

  it("ignores bookings in other rooms", () => {
    expect(
      overlaps(
        booking({ roomId: "r2" }),
        "2026-06-23T10:30:00.000Z",
        "2026-06-23T11:30:00.000Z",
        "r1",
      ),
    ).toBe(false);
  });
});

describe("findConflict", () => {
  it("returns the first overlapping booking", () => {
    const existing = booking({ id: "b99" });
    const conflict = findConflict(
      [existing],
      "2026-06-23T10:30:00.000Z",
      "2026-06-23T11:30:00.000Z",
      "r1",
    );
    expect(conflict?.id).toBe("b99");
  });
});

describe("canModifyBooking", () => {
  const b = booking();

  it("allows the booking owner", () => {
    expect(canModifyBooking(user({ id: "u1" }), b, room())).toBe(true);
  });

  it("allows admins", () => {
    expect(canModifyBooking(user({ id: "u3", role: "admin" }), b, room())).toBe(true);
  });

  it("allows office managers for their office", () => {
    expect(
      canModifyBooking(
        user({ id: "u2", role: "office_manager", managedOffice: "London" }),
        b,
        room({ office: "London" }),
      ),
    ).toBe(true);
  });

  it("denies office managers for other offices", () => {
    expect(
      canModifyBooking(
        user({ id: "u2", role: "office_manager", managedOffice: "London" }),
        b,
        room({ office: "Berlin" }),
      ),
    ).toBe(false);
  });
});

describe("canApproveBooking", () => {
  const b = booking();
  it("allows admins", () => {
    expect(canApproveBooking(user({role: "admin"}), room())).toBe(true);
  });
  it("allows office managers for their office", () => {
    expect(
      canApproveBooking(
        user({ role: "office_manager", managedOffice: "London" }),
        room({ office: "London" }),
      ),
    ).toBe(true);
  });
  it("denies office managers for other offices", () => {
    expect(
      canApproveBooking(
        user({ role: "office_manager", managedOffice: "London" }),
        room({ office: "Berlin" }),
      ),
    ).toBe(false);
  });
  it("denies employees, even if it is their own booking", () => {
    expect(canApproveBooking(user({ role: "employee" }), room())).toBe(false);
  });

  });
