// custom type for users, in this case employee, office manager, and admin
// export means it can be imported into other files
// type means its a custom type, not a class or interface
export type Role = "employee" | "office_manager" | "admin"; 

// interface means its a custom type that can have properties and methods
// it describes the shape of an object, in this case a user object
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managedOffice?: string;// optional 
}

export type Equipment = "projector" | "whiteboard" | "video_conferencing";

export interface Room {
  id: string;
  name: string;
  capacity: number;
  office: string;
  equipment: Equipment[];//array of equipments
  requiresApproval: true | false; // added this as per phase 1
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "rejected";//changed to have pending as well

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  start: string;
  end: string;
  status: BookingStatus;
  attendees: number;
  createdAt: string;
  cancelledAt?: string;
}

// interface for api error response, in this case a string message
export interface ApiError {
  error: string;
}
