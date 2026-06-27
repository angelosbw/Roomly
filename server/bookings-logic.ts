import type { Booking, Room, User } from "../shared/types";

export function overlaps(
  booking: Booking,
  startISO: string,
  endISO: string,
  roomId: string,
  ignoreId?: string,
) {
  //changed from the original to instead allow if its not pending or confirmed. as per phase 1 requirement  
  if (booking.id === ignoreId) return false;
  if (booking.status !== "pending" && booking.status !== "confirmed") return false;
  if (booking.roomId !== roomId) return false;
  return new Date(booking.start) < new Date(endISO) && new Date(booking.end) > new Date(startISO);
}

export function canModifyBooking(user: User, booking: Booking, room: Room | undefined) {
  if (booking.userId === user.id) return true;
  if (user.role === "admin") return true;
  if (user.role === "office_manager" && room && user.managedOffice === room.office) return true;
  return false;
}

//method to check if the role of user allows for them to approve bookings depending on role and office they manage 
export function canApproveBooking(user:User, room: Room | undefined) {
  if (user.role === "admin") return true;
  if (user.role === "office_manager" && room && user.managedOffice === room.office) return true;
  return false;
}

export function validateBookingTimes(start: string, end: string) {
  if (new Date(end) <= new Date(start)) {
    return "End must be after start";
  }
  return null;
}

export function validateCapacity(attendees: number, room: Room | undefined) {
  if (room && attendees > room.capacity) {
    return `Exceeds room capacity (${room.capacity})`;
  }
  return null;
}

export function findConflict(
  bookings: Booking[],
  start: string,
  end: string,
  roomId: string,
  ignoreId?: string,
) {
  return bookings.find((booking) => overlaps(booking, start, end, roomId, ignoreId));
}
