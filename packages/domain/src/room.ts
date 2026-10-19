// Rules for adding a room. Shared so the form can show errors as you type
// and the backend can enforce exactly the same rules when saving.

import { nationalRatio, nqfRatio } from "./ratios"
import { AGE_GROUPS, ROOM_THEMES, type AgeGroup, type AustralianState, type RoomTheme } from "./types"

export interface NewRoom {
  name: string
  ageGroup: AgeGroup
  /** Children per educator. May be stricter (lower) than the legal ratio, never looser. */
  childrenPerEducator: number
  licensedPlaces: number
  theme: RoomTheme
}

export type NewRoomErrors = Partial<Record<keyof NewRoom, string>>

/** A colour that suits the age group, so rooms look consistent by default. */
export function defaultTheme(ageGroup: AgeGroup): RoomTheme {
  return ({ "0-24m": "nursery", "24-36m": "toddler", "36m-preschool": "preschool", "school-age": "kindy" } as const)[ageGroup]
}

/** Legal ratio for the centre's state, or the national one if the state isn't known. */
export function legalRatio(ageGroup: AgeGroup, state: AustralianState | null): number {
  return state ? nqfRatio(state, ageGroup) : nationalRatio(ageGroup)
}

/**
 * Check a new room. `existingNames` are the centre's current rooms, so two
 * rooms can't share a name. Returns an error message per invalid field.
 */
export function validateNewRoom(
  input: NewRoom,
  { state, existingNames }: { state: AustralianState | null; existingNames: string[] },
): NewRoomErrors {
  const errors: NewRoomErrors = {}

  const name = input.name.trim()
  if (!name) errors.name = "Enter a room name."
  else if (name.length > 40) errors.name = "Keep it under 40 characters."
  else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase()))
    errors.name = "There's already a room with this name."

  if (!AGE_GROUPS.includes(input.ageGroup)) {
    errors.ageGroup = "Choose an age group."
  } else {
    const max = legalRatio(input.ageGroup, state)
    if (!Number.isInteger(input.childrenPerEducator) || input.childrenPerEducator < 1)
      errors.childrenPerEducator = "Enter a whole number of children per educator."
    else if (input.childrenPerEducator > max)
      errors.childrenPerEducator = `Can't be looser than the legal ratio of 1:${max}.`
  }

  if (!Number.isInteger(input.licensedPlaces) || input.licensedPlaces < 1)
    errors.licensedPlaces = "Enter at least 1 place."
  else if (input.licensedPlaces > 150) errors.licensedPlaces = "That's more places than one room can hold."

  if (!ROOM_THEMES.includes(input.theme)) errors.theme = "Choose a colour."

  return errors
}
