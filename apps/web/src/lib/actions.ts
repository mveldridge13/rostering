"use server"

// Server actions: the UI's only way to change data, alongside the reads in
// ./api.ts. Each one validates its input again here, because anything sent
// from the browser can be tampered with.
//
// NOT CONNECTED YET: once the API exists, each action calls it after
// validating. Until then they report that nothing was saved.

import { type NewEducator, type NewEducatorErrors, validateNewEducator } from "@rostering/domain/educator"

export type ActionResult<Errors> =
  | { status: "saved"; id: string }
  | { status: "invalid"; errors: Errors }
  | { status: "not-connected" }

export async function createEducator(input: NewEducator): Promise<ActionResult<NewEducatorErrors>> {
  const errors = validateNewEducator(input)
  if (Object.keys(errors).length > 0) return { status: "invalid", errors }

  return { status: "not-connected" }
}
