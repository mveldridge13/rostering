import { describe, expect, it } from "vitest"

import { nationalRatio, nqfRatio } from "./ratios"
import { defaultTheme, legalRatio, type NewRoom, validateNewRoom } from "./room"
import { AUSTRALIAN_STATES } from "./types"

const room = (overrides: Partial<NewRoom> = {}): NewRoom => ({
  name: "Possums",
  ageGroup: "0-24m",
  childrenPerEducator: 4,
  licensedPlaces: 10,
  theme: "nursery",
  ...overrides,
})

const ctx = { state: "NSW" as const, existingNames: ["Wombats"] }

describe("nqfRatio", () => {
  it("is 1:4 for babies and 1:5 for toddlers in every state", () => {
    for (const state of AUSTRALIAN_STATES) {
      expect(nqfRatio(state, "0-24m")).toBe(4)
      expect(nqfRatio(state, "24-36m")).toBe(5)
    }
  })

  it.each([
    ["NSW", 10],
    ["TAS", 10],
    ["WA", 10],
    ["VIC", 11],
    ["QLD", 11],
    ["SA", 11],
    ["ACT", 11],
    ["NT", 11],
  ] as const)("is 1:%s… for 36 months to preschool in %s", (state, ratio) => {
    expect(nqfRatio(state, "36m-preschool")).toBe(ratio)
  })

  it("is 1:15 for school age except 1:13 in WA", () => {
    expect(nqfRatio("NSW", "school-age")).toBe(15)
    expect(nqfRatio("WA", "school-age")).toBe(13)
  })

  it("falls back to the national ratio when the state is unknown", () => {
    expect(legalRatio("36m-preschool", null)).toBe(nationalRatio("36m-preschool"))
    expect(legalRatio("36m-preschool", "NSW")).toBe(10)
  })
})

describe("validateNewRoom", () => {
  it("accepts a valid room", () => {
    expect(validateNewRoom(room(), ctx)).toEqual({})
  })

  it("requires a unique name, ignoring case and spaces", () => {
    expect(validateNewRoom(room({ name: " " }), ctx)).toHaveProperty("name")
    expect(validateNewRoom(room({ name: " wombats " }), ctx)).toEqual({ name: "There's already a room with this name." })
  })

  it("allows a stricter ratio but never a looser one", () => {
    expect(validateNewRoom(room({ childrenPerEducator: 3 }), ctx)).toEqual({})
    expect(validateNewRoom(room({ childrenPerEducator: 5 }), ctx)).toEqual({
      childrenPerEducator: "Can't be looser than the legal ratio of 1:4.",
    })
  })

  it("applies the centre's state to the ratio limit", () => {
    const preschool = room({ ageGroup: "36m-preschool", childrenPerEducator: 11, theme: "preschool" })
    expect(validateNewRoom(preschool, { ...ctx, state: "VIC" })).toEqual({})
    expect(validateNewRoom(preschool, { ...ctx, state: "NSW" })).toHaveProperty("childrenPerEducator")
  })

  it.each([0, -1, 2.5, Number.NaN])("rejects %s children per educator", (childrenPerEducator) => {
    expect(validateNewRoom(room({ childrenPerEducator }), ctx)).toHaveProperty("childrenPerEducator")
  })

  it.each([0, 3.5, 151, Number.NaN])("rejects %s licensed places", (licensedPlaces) => {
    expect(validateNewRoom(room({ licensedPlaces }), ctx)).toHaveProperty("licensedPlaces")
  })
})

describe("defaultTheme", () => {
  it("gives each age group its own colour", () => {
    expect(defaultTheme("0-24m")).toBe("nursery")
    expect(defaultTheme("24-36m")).toBe("toddler")
    expect(defaultTheme("36m-preschool")).toBe("preschool")
    expect(defaultTheme("school-age")).toBe("kindy")
  })
})
