export type StatusName =
  | "burn"
  | "shield"
  | "armor_break"
  | "speed_up"
  | "stun"
  | "poison"
  | "regen"
  | "counter"
  | "focus"
  | "mark"

export type ActiveStatus = {
  name: StatusName
  turns: number
  power: number
}

export type FighterStatus = ActiveStatus[]

export function addStatus(statuses: FighterStatus, status: ActiveStatus): FighterStatus {
  const existing = statuses.find((item) => item.name === status.name)
  if (!existing) return [...statuses, status]

  return statuses.map((item) =>
    item.name === status.name
      ? { ...item, turns: Math.max(item.turns, status.turns), power: Math.max(item.power, status.power) }
      : item,
  )
}

export function tickStatuses(statuses: FighterStatus): FighterStatus {
  return statuses
    .map((status) => ({ ...status, turns: status.turns - 1 }))
    .filter((status) => status.turns > 0 && status.power > 0)
}

export function getStatus(statuses: FighterStatus, name: StatusName): ActiveStatus | undefined {
  return statuses.find((status) => status.name === name)
}

export function removeStatus(statuses: FighterStatus, name: StatusName): FighterStatus {
  return statuses.filter((status) => status.name !== name)
}
