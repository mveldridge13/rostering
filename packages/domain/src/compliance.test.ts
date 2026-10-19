import { describe, expect, it } from "vitest"

import {
  credentialState,
  daysUntil,
  paidHours,
  requiredEducators,
  roomCoverage,
  shiftCost,
  summariseCoverage,
  worstCredentialState,
} from "./compliance"
import type { AttendanceForecast, Educator, Room, Shift } from "./types"

const OPENS = 390 // 6:30am

const room = (childrenPerEducator: number, id = "possums"): Room => ({
  id,
  centreId: "c1",
  name: id,
  ageGroup: "0-24m",
  childrenPerEducator,
  licensedPlaces: 20,
  theme: "nursery",
})

const educator = (id: string, overrides: Partial<Educator> = {}): Educator => ({
  id,
  firstName: id,
  lastName: "Test",
  role: "Diploma Educator",
  employment: "Full-time",
  primaryRoomId: "possums",
  contractHours: 38,
  hourlyRate: 32,
  credentials: [],
  countsInRatio: true,
  ...overrides,
})

const shift = (educatorId: string, start: number, end: number, overrides: Partial<Shift> = {}): Shift => ({
  id: `${educatorId}-${start}`,
  educatorId,
  roomId: "possums",
  date: "2026-10-19",
  start,
  end,
  breakMinutes: 0,
  tags: [],
  status: "published",
  ...overrides,
})

const forecast = (children: number[], roomId = "possums"): AttendanceForecast => ({
  roomId,
  date: "2026-10-19",
  slotMinutes: 30,
  children,
})

describe("requiredEducators", () => {
  it("needs no educators when no children are booked", () => {
    expect(requiredEducators(0, 4)).toBe(0)
  })

  it.each([
    // [children, ratio, educators]  NQF ratios
    [1, 4, 1],
    [4, 4, 1],
    [5, 4, 2], // 0–24 months, 1:4 — one extra child needs another educator
    [8, 4, 2],
    [9, 4, 3],
    [5, 5, 1], // 24–36 months, 1:5
    [11, 5, 3],
    [10, 10, 1], // 36 months+ in NSW, 1:10
    [21, 10, 3],
    [22, 11, 2], // 36 months+ in most other states, 1:11
  ])("%i children at 1:%i need %i educators", (children, ratio, expected) => {
    expect(requiredEducators(children, ratio)).toBe(expected)
  })
})

describe("roomCoverage", () => {
  it("returns one slot per forecast entry, starting at opening time", () => {
    const slots = roomCoverage(room(4), forecast([0, 0, 0]), [], [], OPENS)
    expect(slots.map((s) => s.start)).toEqual([390, 420, 450])
  })

  it("marks a slot closed when no children are booked and nobody is rostered", () => {
    const [slot] = roomCoverage(room(4), forecast([0]), [], [], OPENS)
    expect(slot).toMatchObject({ children: 0, required: 0, rostered: 0, status: "closed" })
  })

  it("marks a slot under ratio when fewer educators are rostered than required", () => {
    const [slot] = roomCoverage(room(4), forecast([5]), [shift("a", 390, 900)], [educator("a")], OPENS)
    expect(slot).toMatchObject({ required: 2, rostered: 1, status: "under" })
  })

  it("marks a slot met when rostered equals required", () => {
    const shifts = [shift("a", 390, 900), shift("b", 390, 900)]
    const [slot] = roomCoverage(room(4), forecast([5]), shifts, [educator("a"), educator("b")], OPENS)
    expect(slot.status).toBe("met")
  })

  it("marks a slot over-staffed at three or more educators above requirement", () => {
    const ids = ["a", "b", "c", "d"]
    const shifts = ids.map((id) => shift(id, 390, 900))
    const [two] = roomCoverage(room(4), forecast([4]), shifts.slice(0, 3), ids.map((id) => educator(id)), OPENS)
    const [three] = roomCoverage(room(4), forecast([4]), shifts, ids.map((id) => educator(id)), OPENS)
    expect(two.status).toBe("met")
    expect(three.status).toBe("over")
  })

  it("counts an educator in a slot only if on shift at the slot's midpoint", () => {
    // Slot 6:30–7:00 has its midpoint at 6:45 (405).
    const educators = [educator("a")]
    const at = (start: number, end: number) =>
      roomCoverage(room(4), forecast([1]), [shift("a", start, end)], educators, OPENS)[0].rostered
    expect(at(390, 900)).toBe(1) // on from opening
    expect(at(405, 900)).toBe(1) // starts exactly at the midpoint
    expect(at(406, 900)).toBe(0) // starts after the midpoint
    expect(at(300, 405)).toBe(0) // leaves exactly at the midpoint
    expect(at(300, 406)).toBe(1) // still there just after the midpoint
  })

  it("ignores educators who do not count in ratio, such as the cook or director", () => {
    const shifts = [shift("cook", 390, 900)]
    const [slot] = roomCoverage(room(4), forecast([3]), shifts, [educator("cook", { countsInRatio: false })], OPENS)
    expect(slot).toMatchObject({ rostered: 0, status: "under" })
  })

  it("ignores shifts in other rooms", () => {
    const shifts = [shift("a", 390, 900, { roomId: "wombats" })]
    const [slot] = roomCoverage(room(4), forecast([3]), shifts, [educator("a")], OPENS)
    expect(slot.rostered).toBe(0)
  })

  it("ignores shifts for educators it does not know about", () => {
    const [slot] = roomCoverage(room(4), forecast([3]), [shift("ghost", 390, 900)], [], OPENS)
    expect(slot.rostered).toBe(0)
  })

  it("treats an educator rostered with no children booked as met, not closed", () => {
    const [slot] = roomCoverage(room(4), forecast([0]), [shift("a", 390, 900)], [educator("a")], OPENS)
    expect(slot.status).toBe("met")
  })

  it("tracks a day where the room fills up then empties", () => {
    // 2 → 6 → 3 children; one educator all day, a second from 7:00am.
    const shifts = [shift("a", 390, 900), shift("b", 420, 900)]
    const slots = roomCoverage(room(4), forecast([2, 6, 3]), shifts, [educator("a"), educator("b")], OPENS)
    expect(slots.map((s) => [s.required, s.rostered, s.status])).toEqual([
      [1, 1, "met"],
      [2, 2, "met"],
      [1, 2, "met"],
    ])
  })
})

describe("summariseCoverage", () => {
  const slot = (status: "closed" | "under" | "met" | "over", children = 4, start = 390) => ({
    start,
    children,
    required: 1,
    rostered: 1,
    status,
  })

  it("reports full compliance when the room is closed all day", () => {
    const summary = summariseCoverage([slot("closed", 0), slot("closed", 0)])
    expect(summary).toMatchObject({ activeSlots: 0, compliance: 1, peakChildren: 0, firstGap: undefined })
  })

  it("excludes closed slots from the compliance rate", () => {
    const summary = summariseCoverage([slot("closed", 0), slot("met"), slot("under"), slot("met"), slot("over")])
    expect(summary).toMatchObject({ activeSlots: 4, underSlots: 1, overSlots: 1, compliance: 0.75 })
  })

  it("reports the peak headcount and the first under-ratio slot", () => {
    const summary = summariseCoverage([slot("met", 3, 390), slot("under", 9, 420), slot("under", 7, 450)])
    expect(summary.peakChildren).toBe(9)
    expect(summary.firstGap?.start).toBe(420)
  })
})

describe("credentials", () => {
  const asOf = "2026-10-19"

  it.each([
    ["2026-10-18", "expired"], // yesterday
    ["2026-10-19", "expiring"], // expires today: still valid today
    ["2026-11-18", "expiring"], // 30 days out
    ["2026-11-19", "valid"], // 31 days out
  ] as const)("a credential expiring %s is %s", (expiresOn, state) => {
    expect(credentialState({ type: "WWCC", expiresOn }, asOf)).toBe(state)
  })

  it("supports a custom warning window", () => {
    expect(credentialState({ type: "CPR", expiresOn: "2026-11-02" }, asOf, 7)).toBe("valid")
  })

  it("counts calendar days until a date", () => {
    expect(daysUntil("2026-10-22", asOf)).toBe(3)
    expect(daysUntil("2026-10-16", asOf)).toBe(-3)
  })

  it("reports an educator's worst credential", () => {
    const e = (dates: string[]) =>
      educator("a", { credentials: dates.map((expiresOn) => ({ type: "WWCC" as const, expiresOn })) })
    expect(worstCredentialState(e([]), asOf)).toBe("valid")
    expect(worstCredentialState(e(["2027-01-01", "2026-10-30"]), asOf)).toBe("expiring")
    expect(worstCredentialState(e(["2026-10-30", "2026-01-01"]), asOf)).toBe("expired")
  })
})

describe("hours and cost", () => {
  it("deducts the unpaid break from paid hours", () => {
    expect(paidHours({ start: 390, end: 900, breakMinutes: 60 })).toBe(7.5)
    expect(paidHours({ start: 600, end: 840, breakMinutes: 0 })).toBe(4)
  })

  it("costs a permanent shift at the base hourly rate", () => {
    expect(shiftCost(shift("a", 390, 900, { breakMinutes: 60 }), educator("a", { hourlyRate: 30 }))).toBe(225)
  })

  it("adds a 25% casual loading", () => {
    const casual = educator("a", { hourlyRate: 30, employment: "Casual" })
    expect(shiftCost(shift("a", 390, 900, { breakMinutes: 60 }), casual)).toBe(281.25)
  })
})
