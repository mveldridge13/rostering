// Educator-to-child ratios for centre-based services under the National
// Quality Framework (Education and Care Services National Regulations,
// reg 123, with state and territory variations).
//
// VERIFY BEFORE GO-LIVE: transcribed from ACECQA's published ratio table,
// not checked against the regulations in this repo. Confirm each figure at
// https://www.acecqa.gov.au/nqf/educator-to-child-ratios and record the date
// below when you do.

import type { AgeGroup, AustralianState } from "./types"

export const RATIOS_LAST_VERIFIED: string | null = null

const NATIONAL: Record<AgeGroup, number> = {
  "0-24m": 4,
  "24-36m": 5,
  "36m-preschool": 11,
  "school-age": 15,
}

const STATE_VARIATIONS: Partial<Record<AustralianState, Partial<Record<AgeGroup, number>>>> = {
  NSW: { "36m-preschool": 10 },
  TAS: { "36m-preschool": 10 },
  WA: { "36m-preschool": 10, "school-age": 13 },
}

/** The legal maximum children per educator for an age group in a state. */
export function nqfRatio(state: AustralianState, ageGroup: AgeGroup): number {
  return STATE_VARIATIONS[state]?.[ageGroup] ?? NATIONAL[ageGroup]
}

/** The national ratio, used when the centre's state isn't known. */
export function nationalRatio(ageGroup: AgeGroup): number {
  return NATIONAL[ageGroup]
}
