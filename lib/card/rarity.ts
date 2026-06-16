export const rarityWeights = {
  common: 65,
  rare: 25,
  epic: 8,
  legendary: 2,
} as const

export const rarityLabels = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
} as const

export type Rarity = keyof typeof rarityWeights

export function rollRarity(random = Math.random): Rarity {
  const total = Object.values(rarityWeights).reduce((sum, value) => sum + value, 0)
  let roll = random() * total

  for (const [rarity, weight] of Object.entries(rarityWeights)) {
    roll -= weight
    if (roll <= 0) return rarity as Rarity
  }

  return "common"
}
