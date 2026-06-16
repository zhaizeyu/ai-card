import type { Rarity } from "./rarity"

export const rarityStatBudget: Record<Rarity, number> = {
  common: 12,
  rare: 16,
  epic: 20,
  legendary: 24,
}

export type StatBlock = {
  hp: number
  atk: number
  def: number
  spd: number
  powerScore: number
}

export function generateStats(rarity: Rarity): StatBlock {
  let remaining = rarityStatBudget[rarity]
  const atk = 2 + takeStat(remaining)
  remaining -= atk - 2
  const def = 2 + takeStat(remaining)
  remaining -= def - 2
  const spd = 2 + remaining
  const hp = 20 + def * 3 + Math.floor(rarityStatBudget[rarity] / 2)
  const powerScore = hp + atk * 4 + def * 3 + spd * 3

  return { hp, atk, def, spd, powerScore }
}

function takeStat(remaining: number): number {
  const min = 2
  const max = Math.max(min, remaining - 2)
  return Math.floor(Math.random() * (max - min + 1)) + min
}
