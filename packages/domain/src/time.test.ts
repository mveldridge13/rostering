import { describe, expect, it } from "vitest"

import {
  addDaysIso,
  formatClock,
  formatHours,
  formatMinutes,
  formatTimeRange,
  weekdayIndex,
  weekdaysOf,
  weekStartOf,
} from "./time"

describe("weeks", () => {
  it("starts the week on Monday", () => {
    expect(weekStartOf("2026-10-19")).toBe("2026-10-19") // Monday
    expect(weekStartOf("2026-10-23")).toBe("2026-10-19") // Friday
    expect(weekStartOf("2026-10-25")).toBe("2026-10-19") // Sunday belongs to the week before
  })

  it("lists Monday to Friday", () => {
    expect(weekdaysOf("2026-10-19")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"])
  })

  it("crosses month and year boundaries", () => {
    expect(addDaysIso("2026-10-30", 3)).toBe("2026-11-02")
    expect(addDaysIso("2026-12-29", 7)).toBe("2027-01-05")
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28")
  })

  it("is unaffected by the daylight saving change", () => {
    // NSW clocks go forward on Sunday 4 October 2026.
    expect(addDaysIso("2026-10-03", 1)).toBe("2026-10-04")
    expect(addDaysIso("2026-10-04", 1)).toBe("2026-10-05")
  })

  it("numbers weekdays from Monday = 0", () => {
    expect(weekdayIndex("2026-10-19")).toBe(0)
    expect(weekdayIndex("2026-10-23")).toBe(4)
    expect(weekdayIndex("2026-10-25")).toBe(6)
  })
})

describe("formatting", () => {
  it.each([
    [0, "12am"],
    [390, "6:30am"],
    [720, "12pm"],
    [780, "1pm"],
    [1110, "6:30pm"],
  ])("formats %i minutes as %s", (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text)
  })

  it("formats a time range", () => {
    expect(formatTimeRange(390, 900)).toBe("6:30am – 3pm")
  })

  it("formats compact clock times without am/pm", () => {
    expect(formatClock(390)).toBe("6:30")
    expect(formatClock(720)).toBe("12:00")
    expect(formatClock(1110)).toBe("6:30")
  })

  it("formats hours without a needless decimal", () => {
    expect(formatHours(8)).toBe("8h")
    expect(formatHours(7.5)).toBe("7.5h")
    expect(formatHours(7.25)).toBe("7.3h")
  })
})
