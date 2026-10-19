"use server"

// Server actions: the UI's only way to change data, alongside the reads in
// ./api.ts. Each one validates its input again here, because anything sent
// from the browser can be tampered with.
//
// NOT CONNECTED YET: once the API exists, each action calls it after
// validating. Until then they report that nothing was saved.

import { type NewEducator, type NewEducatorErrors, validateNewEducator } from "@rostering/domain/educator"
import { type NewRoom, type NewRoomErrors, validateNewRoom } from "@rostering/domain/room"

import { getCentre, getRooms } from "./api"

export type ActionResult<Errors> =
  | { status: "saved"; id: string }
  | { status: "invalid"; errors: Errors }
  | { status: "not-connected" }

export async function createEducator(input: NewEducator): Promise<ActionResult<NewEducatorErrors>> {
  const errors = validateNewEducator(input)
  if (Object.keys(errors).length > 0) return { status: "invalid", errors }

  return { status: "not-connected" }
}

export async function createRoom(input: NewRoom): Promise<ActionResult<NewRoomErrors>> {
  // The ratio limit and duplicate-name check use the centre as stored, never
  // values sent from the browser.
  const [centre, rooms] = await Promise.all([getCentre(), getRooms()])
  const errors = validateNewRoom(input, { state: centre?.state ?? null, existingNames: rooms.map((r) => r.name) })
  if (Object.keys(errors).length > 0) return { status: "invalid", errors }

  return { status: "not-connected" }
}
