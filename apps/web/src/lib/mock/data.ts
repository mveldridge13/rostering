// Deterministic sample data for building the UI. Replace with the real
// rostering API (and CCS booking sync) once the engine exists.

import { addDaysIso, today, weekdayIndex, weekdaysOf, weekStartOf } from "@rostering/domain/time"
import type {
  AttendanceForecast,
  Centre,
  Credential,
  Educator,
  IsoDate,
  Leave,
  OpenShift,
  Room,
  Shift,
  ShiftTag,
} from "@rostering/domain/types"

export const centre: Centre = {
  id: "ctr-1",
  name: "Little Wattles Early Learning",
  serviceApprovalNumber: "SE-40012345",
  state: "NSW",
  opensAt: 6 * 60 + 30,
  closesAt: 18 * 60 + 30,
  weeklyWageBudget: 23000,
}

export const rooms: Room[] = [
  { id: "possums", centreId: centre.id, name: "Possums", ageGroup: "0-24m", childrenPerEducator: 4, licensedPlaces: 10, theme: "nursery" },
  { id: "wombats", centreId: centre.id, name: "Wombats", ageGroup: "24-36m", childrenPerEducator: 5, licensedPlaces: 15, theme: "toddler" },
  { id: "kookaburras", centreId: centre.id, name: "Kookaburras", ageGroup: "36m-preschool", childrenPerEducator: 10, licensedPlaces: 20, theme: "preschool" },
  { id: "platypus", centreId: centre.id, name: "Platypus", ageGroup: "36m-preschool", childrenPerEducator: 10, licensedPlaces: 22, theme: "kindy" },
]

const now = today()

/** Credentials with expiry relative to today so alerts always have something to show. */
function creds(offsets: Partial<Record<Credential["type"], number>>): Credential[] {
  const defaults: Record<Credential["type"], number> = {
    WWCC: 900,
    "First Aid": 400,
    CPR: 200,
    Anaphylaxis: 500,
    Asthma: 500,
    "Child Protection": 300,
  }
  return (Object.keys(defaults) as Credential["type"][]).map((type) => ({
    type,
    expiresOn: addDaysIso(now, offsets[type] ?? defaults[type]),
  }))
}

export const educators: Educator[] = [
  { id: "e1", firstName: "Sarah", lastName: "Mitchell", role: "Centre Director", employment: "Full-time", primaryRoomId: null, contractHours: 38, hourlyRate: 48.2, credentials: creds({}), countsInRatio: false },
  { id: "e2", firstName: "Priya", lastName: "Sharma", role: "Early Childhood Teacher", employment: "Full-time", primaryRoomId: "platypus", contractHours: 38, hourlyRate: 42.5, credentials: creds({ CPR: 12 }), countsInRatio: true },
  { id: "e3", firstName: "James", lastName: "O'Connor", role: "Early Childhood Teacher", employment: "Part-time", primaryRoomId: "kookaburras", contractHours: 24, hourlyRate: 41.1, credentials: creds({}), countsInRatio: true },
  { id: "e4", firstName: "Mei Lin", lastName: "Tan", role: "Diploma Educator", employment: "Full-time", primaryRoomId: "possums", contractHours: 38, hourlyRate: 33.4, credentials: creds({ "First Aid": 21 }), countsInRatio: true },
  { id: "e5", firstName: "Hannah", lastName: "Brooks", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "possums", contractHours: 38, hourlyRate: 29.1, credentials: creds({}), countsInRatio: true },
  { id: "e6", firstName: "Aisha", lastName: "Rahman", role: "Certificate III Educator", employment: "Part-time", primaryRoomId: "possums", contractHours: 24, hourlyRate: 28.6, credentials: creds({ WWCC: -3 }), countsInRatio: true },
  { id: "e7", firstName: "Tom", lastName: "Nguyen", role: "Diploma Educator", employment: "Full-time", primaryRoomId: "wombats", contractHours: 38, hourlyRate: 33.4, credentials: creds({}), countsInRatio: true },
  { id: "e8", firstName: "Grace", lastName: "Whitfield", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "wombats", contractHours: 38, hourlyRate: 29.1, credentials: creds({ Anaphylaxis: 27 }), countsInRatio: true },
  { id: "e9", firstName: "Olivia", lastName: "Martin", role: "Working Towards", employment: "Casual", primaryRoomId: "wombats", contractHours: 0, hourlyRate: 26.3, credentials: creds({}), countsInRatio: true },
  { id: "e10", firstName: "Liam", lastName: "Fraser", role: "Diploma Educator", employment: "Full-time", primaryRoomId: "kookaburras", contractHours: 38, hourlyRate: 33.4, credentials: creds({}), countsInRatio: true },
  { id: "e11", firstName: "Zoe", lastName: "Papadopoulos", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "kookaburras", contractHours: 38, hourlyRate: 29.1, credentials: creds({}), countsInRatio: true },
  { id: "e12", firstName: "Ella", lastName: "Thompson", role: "Diploma Educator", employment: "Full-time", primaryRoomId: "platypus", contractHours: 38, hourlyRate: 33.4, credentials: creds({}), countsInRatio: true },
  { id: "e13", firstName: "Noah", lastName: "Williams", role: "Certificate III Educator", employment: "Part-time", primaryRoomId: "platypus", contractHours: 30, hourlyRate: 28.6, credentials: creds({}), countsInRatio: true },
  { id: "e14", firstName: "Chloe", lastName: "Bennett", role: "Diploma Educator", employment: "Part-time", primaryRoomId: "possums", contractHours: 24, hourlyRate: 33.4, credentials: creds({}), countsInRatio: true },
  { id: "e15", firstName: "Ruby", lastName: "Anderson", role: "Certificate III Educator", employment: "Casual", primaryRoomId: null, contractHours: 0, hourlyRate: 28.6, credentials: creds({}), countsInRatio: true },
  { id: "e17", firstName: "Isabella", lastName: "Rossi", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "wombats", contractHours: 38, hourlyRate: 29.1, credentials: creds({}), countsInRatio: true },
  { id: "e18", firstName: "Jack", lastName: "Henderson", role: "Diploma Educator", employment: "Full-time", primaryRoomId: "kookaburras", contractHours: 38, hourlyRate: 33.4, credentials: creds({ "Child Protection": 9 }), countsInRatio: true },
  { id: "e19", firstName: "Sophie", lastName: "Clarke", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "platypus", contractHours: 38, hourlyRate: 29.1, credentials: creds({}), countsInRatio: true },
  { id: "e20", firstName: "Maya", lastName: "Patel", role: "Certificate III Educator", employment: "Full-time", primaryRoomId: "possums", contractHours: 38, hourlyRate: 29.1, credentials: creds({}), countsInRatio: true },
  { id: "e16", firstName: "Daniel", lastName: "Costa", role: "Cook", employment: "Part-time", primaryRoomId: null, contractHours: 28, hourlyRate: 27.4, credentials: creds({}), countsInRatio: false },
]

// Shift templates: [start, end, unpaid break minutes]. 8.5h on site, 7.5h paid.
const T = {
  E: [390, 900, 60], //   6:30 – 3:00  opener
  M1: [450, 960, 60], //  7:30 – 4:00
  M2: [510, 1020, 60], // 8:30 – 5:00
  C: [600, 1110, 60], // 10:00 – 6:30 closer
  D: [480, 990, 60], //   8:00 – 4:30 director
  K: [420, 870, 30], //   7:00 – 2:30 cook
} as const

type TemplateKey = keyof typeof T

/** Each room runs an opener, two mids and a closer; who takes which rotates daily. */
const roomRotation: TemplateKey[] = ["E", "M1", "M2", "C"]

/** Educators in each room, Monday → Friday. */
const roomPlans: Record<string, string[][]> = {
  possums: [
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e14"],
    ["e4", "e5", "e20", "e6"],
    ["e4", "e5", "e20", "e14"],
  ],
  wombats: [
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e15"],
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e9"],
    ["e7", "e8", "e17", "e15"],
  ],
  kookaburras: [
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e3"],
    ["e10", "e11", "e18", "e15"],
    ["e10", "e11", "e18"],
  ],
  platypus: [
    ["e2", "e12", "e19", "e14"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
    ["e2", "e12", "e19", "e13"],
  ],
  office: [["e1"], ["e1"], ["e1"], ["e1"], ["e1"]],
  kitchen: [["e16"], ["e16"], ["e16"], ["e16"], []],
}

function templateFor(roomId: string, position: number, day: number): TemplateKey {
  if (roomId === "office") return "D"
  if (roomId === "kitchen") return "K"
  return roomRotation[(position + day) % roomRotation.length]
}

function tagsFor(key: TemplateKey, educator: Educator): ShiftTag[] {
  const tags: ShiftTag[] = []
  if (key === "E") tags.push("Opener")
  if (key === "C") tags.push("Closer")
  if (educator.role === "Centre Director") tags.push("Responsible Person")
  if (educator.employment === "Casual") tags.push("Float")
  return tags
}

export function getLeave(weekStart: IsoDate): Leave[] {
  const current = weekStartOf(now)
  if (weekStart === current) {
    return [
      { educatorId: "e5", date: addDaysIso(weekStart, 2), type: "Personal" },
      { educatorId: "e11", date: addDaysIso(weekStart, 4), type: "Study" },
    ]
  }
  if (weekStart === addDaysIso(current, 7)) {
    return [
      { educatorId: "e8", date: addDaysIso(weekStart, 0), type: "Annual" },
      { educatorId: "e8", date: addDaysIso(weekStart, 1), type: "Annual" },
    ]
  }
  return []
}

interface PlannedShift {
  educator: Educator
  roomId: string
  date: IsoDate
  key: TemplateKey
}

function plannedShifts(weekStart: IsoDate): PlannedShift[] {
  return weekdaysOf(weekStart).flatMap((date, day) =>
    Object.entries(roomPlans).flatMap(([roomId, days]) =>
      (days[day] ?? []).flatMap((educatorId, position) => {
        const educator = educators.find((e) => e.id === educatorId)
        return educator ? [{ educator, roomId, date, key: templateFor(roomId, position, day) }] : []
      }),
    ),
  )
}

export function getShifts(weekStart: IsoDate): Shift[] {
  const leave = getLeave(weekStart)
  const status = weekStart <= weekStartOf(now) ? "published" : "draft"

  return plannedShifts(weekStart)
    .filter((p) => !leave.some((l) => l.educatorId === p.educator.id && l.date === p.date))
    .map(({ educator, roomId, date, key }) => {
      const [start, end, breakMinutes] = T[key]
      return {
        id: `${educator.id}-${date}`,
        educatorId: educator.id,
        roomId,
        date,
        start,
        end,
        breakMinutes,
        tags: tagsFor(key, educator),
        status,
      }
    })
}

/** Shifts vacated by leave become open shifts that need filling. */
export function getOpenShifts(weekStart: IsoDate): OpenShift[] {
  const leave = getLeave(weekStart)
  return plannedShifts(weekStart).flatMap(({ educator, roomId, date, key }) => {
    const absence = leave.find((l) => l.educatorId === educator.id && l.date === date)
    if (!absence) return []
    const [start, end] = T[key]
    return [{
      id: `open-${educator.id}-${date}`,
      roomId,
      date,
      start,
      end,
      reason: `Cover for ${educator.firstName} ${educator.lastName} (${absence.type.toLowerCase()} leave)`,
    }]
  })
}

/** Booked children per room by weekday, as it would arrive from CCS enrolments. */
const bookedByWeekday: Record<string, number[]> = {
  possums: [9, 10, 10, 10, 8],
  wombats: [12, 13, 13, 13, 11],
  kookaburras: [18, 20, 20, 19, 16],
  platypus: [19, 21, 22, 21, 18],
}

/** Share of booked children on site through the day: arrivals 6:30–9:30, departures 3:00–6:30. */
function presence(slotStart: number): number {
  const curve: [number, number][] = [
    [390, 0.1], [420, 0.22], [450, 0.4], [480, 0.62], [510, 0.82], [540, 0.95], [570, 1],
    [900, 1], [930, 0.9], [960, 0.75], [990, 0.55], [1020, 0.38], [1050, 0.22], [1080, 0.08], [1110, 0],
  ]
  for (let i = 0; i < curve.length - 1; i++) {
    const [t0, v0] = curve[i]
    const [t1, v1] = curve[i + 1]
    if (slotStart >= t0 && slotStart < t1) return v0 + ((v1 - v0) * (slotStart - t0)) / (t1 - t0)
  }
  return 0
}

export function getAttendance(date: IsoDate): AttendanceForecast[] {
  const slotMinutes = 30
  const slots = (centre.closesAt - centre.opensAt) / slotMinutes
  const day = weekdayIndex(date)
  return rooms.map((room) => {
    const booked = bookedByWeekday[room.id]?.[day] ?? 0
    return {
      roomId: room.id,
      date,
      slotMinutes,
      children: Array.from({ length: slots }, (_, i) =>
        Math.round(booked * presence(centre.opensAt + i * slotMinutes)),
      ),
    }
  })
}
