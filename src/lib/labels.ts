import type { Role, BookingStatus } from "../../shared/types";

export const EQUIPMENT_LABELS: Record<string, string> = {
  projector: "Projector",
  whiteboard: "Whiteboard",
  video_conferencing: "Video conferencing",
};

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Employee",
  office_manager: "Office Manager",
  admin: "Admin",
};

// this is used to display the status of a booking in a more user friendly way
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};