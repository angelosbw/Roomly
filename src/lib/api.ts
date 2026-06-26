import type { ApiError, Booking, Room, User } from "../../shared/types";

//contains import which is used to get the types
// the ?? checks if left is null or undefined
const API_BASE = import.meta.env.VITE_API_URL ?? "";

//different from interface because it is a class, which means it can be instantiated and have methods
//classes have constructors, which are functions that are called when an instance of the class is created
// they contain logic that is run when the class is instantiated
class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiClientError(body?.error ?? response.statusText, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  getUsers: () => request<{ users: User[] }>("/api/users"),
  getMe: () => request<{ user: User | null }>("/api/auth/me"),
  login: (email: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  getRooms: (params?: {
    q?: string;
    office?: string;
    minCapacity?: string;
    equipment?: string[];
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.office) search.set("office", params.office);
    if (params?.minCapacity) search.set("minCapacity", params.minCapacity);
    if (params?.equipment?.length) search.set("equipment", params.equipment.join(","));
    const query = search.toString();
    return request<{ rooms: Room[] }>(`/api/rooms${query ? `?${query}` : ""}`);
  },
  getBookings: (params?: { roomId?: string; from?: string; to?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.roomId) search.set("roomId", params.roomId);
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.status) search.set("status", params.status);
    const query = search.toString();
    return request<{ bookings: Booking[] }>(`/api/bookings${query ? `?${query}` : ""}`);
  },
  //used to get the pending bookings for the approvals page through the api
  getPendingBookings: () => {
    return request<{ bookings: Booking[] }>("/api/bookings/pending");  
  },
  createBooking: (body: {
    roomId: string;
    title: string;
    start: string;
    end: string;
    attendees: number;
  }) =>
    request<{ booking: Booking }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBooking: (
    id: string,
    body: Partial<Pick<Booking, "roomId" | "title" | "start" | "end" | "attendees">>,
  ) =>
    request<{ booking: Booking }>(`/api/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  cancelBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}/cancel`, {
      method: "POST",
    }),
  //new methods to approve and reject bookings through the api
  approveBooking: (id: string) =>
    request<{ ok: true }>(`/api/bookings/${id}/approve`, {
      method: "POST",
    }),
  rejectBooking: (id: string) =>
    request<{ ok: true }>(`/api/bookings/${id}/reject`, {
      method: "POST",
    }),
};

export { ApiClientError };
