import { describe, expect, it } from "vitest"

import {
  defaultContractHours,
  defaultCountsInRatio,
  expiredCredentials,
  type NewEducator,
  validateNewEducator,
} from "./educator"

const valid = (overrides: Partial<NewEducator> = {}): NewEducator => ({
  firstName: "Mei Lin",
  lastName: "Tan",
  email: "meilin@example.com",
  phone: "0412 345 678",
  role: "Diploma Educator",
  employment: "Full-time",
  primaryRoomId: null,
  contractHours: 38,
  hourlyRate: 33.4,
  countsInRatio: true,
  credentials: [{ type: "WWCC", reference: "WWC1234567E", expiresOn: "2029-01-01" }],
  ...overrides,
})

describe("validateNewEducator", () => {
  it("accepts a complete educator", () => {
    expect(validateNewEducator(valid())).toEqual({})
  })

  it("requires a first and last name", () => {
    expect(validateNewEducator(valid({ firstName: "  ", lastName: "" }))).toMatchObject({
      firstName: expect.any(String),
      lastName: expect.any(String),
    })
  })

  it("treats email and phone as optional but checks them when given", () => {
    expect(validateNewEducator(valid({ email: "", phone: "" }))).toEqual({})
    expect(validateNewEducator(valid({ email: "not-an-email" }))).toHaveProperty("email")
    expect(validateNewEducator(valid({ phone: "12" }))).toHaveProperty("phone")
    expect(validateNewEducator(valid({ phone: "+61 412 345 678" }))).toEqual({})
  })

  it.each([
    ["Full-time", 38, true],
    ["Full-time", 30, false],
    ["Part-time", 24, true],
    ["Part-time", 37.5, true],
    ["Part-time", 38, false],
    ["Part-time", 0, false],
    ["Part-time", 22.25, false],
    ["Casual", 0, true],
    ["Casual", 10, false],
  ] as const)("%s with %d contracted hours is valid: %s", (employment, contractHours, ok) => {
    const errors = validateNewEducator(valid({ employment, contractHours }))
    expect("contractHours" in errors).toBe(!ok)
  })

  it.each([
    [33.4, true],
    [28.65, true],
    [0, false],
    [-5, false],
    [600, false],
    [32.505, false],
    [Number.NaN, false],
  ])("hourly rate %d is valid: %s", (hourlyRate, ok) => {
    expect("hourlyRate" in validateNewEducator(valid({ hourlyRate }))).toBe(!ok)
  })

  it("requires a WWCC with a number and expiry for everyone, including non-contact staff", () => {
    const errors = validateNewEducator(valid({ role: "Cook", countsInRatio: false, credentials: [] }))
    expect(errors).toHaveProperty(["credentials.WWCC"])
    expect(errors).toHaveProperty(["credentials.WWCC.reference"])
  })

  it("rejects a malformed expiry date", () => {
    const errors = validateNewEducator(
      valid({
        credentials: [
          { type: "WWCC", reference: "WWC1", expiresOn: "2029-01-01" },
          { type: "First Aid", reference: "", expiresOn: "2026-13-45" },
        ],
      }),
    )
    expect(errors).toEqual({ "credentials.First Aid": "Enter a valid expiry date." })
  })
})

describe("defaults", () => {
  it("leaves cooks and directors out of ratio by default", () => {
    expect(defaultCountsInRatio("Cook")).toBe(false)
    expect(defaultCountsInRatio("Centre Director")).toBe(false)
    expect(defaultCountsInRatio("Certificate III Educator")).toBe(true)
  })

  it("suggests contracted hours for each employment type", () => {
    expect(defaultContractHours("Full-time")).toBe(38)
    expect(defaultContractHours("Part-time")).toBe(24)
    expect(defaultContractHours("Casual")).toBe(0)
  })
})

describe("expiredCredentials", () => {
  it("lists credentials already expired on the given day", () => {
    const credentials = [
      { type: "WWCC" as const, reference: "x", expiresOn: "2026-10-18" },
      { type: "CPR" as const, reference: "", expiresOn: "2026-10-19" },
      { type: "First Aid" as const, reference: "", expiresOn: "" },
    ]
    expect(expiredCredentials({ credentials }, "2026-10-19")).toEqual(["WWCC"])
  })
})
