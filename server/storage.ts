import { readFile, writeFile } from "node:fs/promises";// gathers read write functions
import { dirname, join } from "node:path";// gathers dirname and join functions
import { fileURLToPath } from "node:url";// gathers fileURLToPath function
import type { Booking, Room, User } from "../shared/types";// gathers the types from the other file

//creates the directory to the data folder
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../data");

// creates a map to store locks for each file so that only one operation can be performed on a file at a time
const locks = new Map<string, Promise<void>>();

//T is the type that is returned from fn, which therefore will be the type that is returned from withFileLock.

async function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(file, prev.then(() => next));

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(file) === next) locks.delete(file);
  }
}

async function readJsonFile<T>(file: string): Promise<T> {
  const path = join(DATA_DIR, file);
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as T;
}

async function writeJsonFile<T>(file: string, data: T): Promise<void> {
  const path = join(DATA_DIR, file);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readUsers() {
  return readJsonFile<User[]>("users.json");
}

//
export function writeUsers(users: User[]) {
  return withFileLock("users.json", () => writeJsonFile("users.json", users));
}

//reads the rooms.json file and returns an array of Room objects
export function readRooms() {
  return readJsonFile<Room[]>("rooms.json");
}

export function writeRooms(rooms: Room[]) {
  return withFileLock("rooms.json", () => writeJsonFile("rooms.json", rooms));
}

export function readBookings() {
  return readJsonFile<Booking[]>("bookings.json");
}

export function writeBookings(bookings: Booking[]) {
  return withFileLock("bookings.json", () => writeJsonFile("bookings.json", bookings));
}

export async function updateBookings(mutator: (bookings: Booking[]) => Booking[] | void) {
  return withFileLock("bookings.json", async () => {
    const bookings = await readBookings();
    const next = mutator(bookings) ?? bookings;
    await writeJsonFile("bookings.json", next);
    return next;
  });
}
