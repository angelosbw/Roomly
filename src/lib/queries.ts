import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Equipment } from "../../shared/types";
import { api } from "./api";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { users } = await api.getUsers();
      return users;
    },
  });
}

export function useRooms(filters?: {
  q?: string;
  office?: string;
  minCapacity?: string;
  equipment?: Equipment[];
}) {
  return useQuery({
    queryKey: ["rooms", filters ?? {}],
    queryFn: async () => {
      const { rooms } = await api.getRooms(filters);
      return rooms;
    },
  });
}

export function useBookings(params?: { roomId?: string; from?: string; to?: string; status?: string }) {
  return useQuery({
    queryKey: ["bookings", params ?? {}],
    queryFn: async () => {
      const { bookings } = await api.getBookings(params);
      return bookings;
    },
  });
}
//this function is used to get the pending bookings for the approvals page
export function usePendingBookings() {
  return useQuery({
    queryKey: ["bookings", "pending"],
    queryFn: async () => {
      const { bookings } = await api.getPendingBookings();
      return bookings;
    },
  });
}

export function useAllBookings() {
  return useBookings();
}

export function useBookingMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const createBooking = useMutation({
    mutationFn: api.createBooking,
    onSuccess: invalidate,
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateBooking>[1] & { id: string }) =>
      api.updateBooking(id, body),
    onSuccess: invalidate,
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: invalidate,
  });
  //made mutations for approving and rejecting bookings through the api
  const approveBooking = useMutation({
    mutationFn: (id: string) => api.approveBooking(id),
    onSuccess: invalidate,
  });
  const rejectBooking = useMutation({
    mutationFn: (id: string) => api.rejectBooking(id),
    onSuccess: invalidate,
  });

  return { createBooking, updateBooking, cancelBooking, approveBooking, rejectBooking };
}
