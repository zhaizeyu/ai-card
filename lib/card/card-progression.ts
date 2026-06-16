import type { Card } from "@prisma/client"

export const MAX_CARD_LEVEL = 10

export type GrowthType = "bruiser" | "tank" | "swift" | "balanced" | "support"

export type ProgressionResult = {
  level: number
  exp: number
  hp: number
  atk: number
  def: number
  spd: number
  effectPower: number
  cooldown: number
  title?: string | null
  passiveUnlocked: boolean
  upgradeUnlocked: boolean
  levelsGained: number
  unlocked: string[]
}

export function getExpNeed(level: number) {
  return 10 + level * level * 5
}

export function getBattleExp(result: "win" | "loss" | "draw") {
  if (result === "win") return 10
  if (result === "draw") return 5
  return 3
}

export function rollGrowthType(prompt: string, effect: string): GrowthType {
  if (["shield", "counter", "armor_break"].includes(effect) || hasAny(prompt, ["盾", "甲", "岩", "钢", "守卫"])) {
    return "tank"
  }
  if (["speed_up", "chain", "stun"].includes(effect) || hasAny(prompt, ["风", "迅捷", "闪电", "猫", "狼"])) {
    return "swift"
  }
  if (["heal", "regen", "cleanse"].includes(effect) || hasAny(prompt, ["治疗", "再生", "光", "圣", "树"])) {
    return "support"
  }
  if (["damage", "burn", "pierce", "execute", "lifesteal"].includes(effect) || hasAny(prompt, ["龙", "火", "爪", "刃"])) {
    return "bruiser"
  }
  return "balanced"
}

export function applyCardProgression(card: Card, result: "win" | "loss" | "draw", gainedExp = getBattleExp(result)): ProgressionResult {
  const oldLevel = card.level
  const { level, exp } = addExp(card.level, card.exp, gainedExp)
  const levelsGained = level - oldLevel
  const stats = applyLevelUpStats(card, oldLevel, level)
  const unlocked = getUnlocks(oldLevel, level)
  const effectPower = oldLevel < 3 && level >= 3 ? Math.min(5, card.effectPower + 1) : card.effectPower
  const cooldown = oldLevel < 7 && level >= 7 ? Math.max(0, card.cooldown - 1) : card.cooldown
  const title = oldLevel < 10 && level >= 10 ? generateTitle(card) : card.title

  return {
    ...stats,
    level,
    exp,
    effectPower,
    cooldown,
    title,
    passiveUnlocked: card.passiveUnlocked || level >= 5,
    upgradeUnlocked: card.upgradeUnlocked || level >= 7,
    levelsGained,
    unlocked,
  }
}

function addExp(currentLevel: number, currentExp: number, gainedExp: number) {
  let level = currentLevel
  let exp = currentExp + gainedExp

  while (level < MAX_CARD_LEVEL && exp >= getExpNeed(level)) {
    exp -= getExpNeed(level)
    level += 1
  }

  if (level >= MAX_CARD_LEVEL) {
    level = MAX_CARD_LEVEL
    exp = Math.min(exp, getExpNeed(MAX_CARD_LEVEL))
  }

  return { level, exp }
}

function applyLevelUpStats(card: Card, oldLevel: number, newLevel: number) {
  let hp = card.hp
  let atk = card.atk
  let def = card.def
  let spd = card.spd

  for (let level = oldLevel + 1; level <= newLevel; level += 1) {
    hp += 2

    if (level % 2 !== 0) continue

    if (card.growthType === "bruiser") atk += 1
    else if (card.growthType === "tank") def += 1
    else if (card.growthType === "swift") spd += 1
    else if (card.growthType === "support") hp += 2
    else {
      const stat = ["atk", "def", "spd"][level % 3]
      if (stat === "atk") atk += 1
      if (stat === "def") def += 1
      if (stat === "spd") spd += 1
    }
  }

  return {
    hp,
    atk,
    def,
    spd,
  }
}

function getUnlocks(oldLevel: number, newLevel: number) {
  const unlocks: string[] = []
  if (oldLevel < 3 && newLevel >= 3) unlocks.push("技能强度 +1")
  if (oldLevel < 5 && newLevel >= 5) unlocks.push("被动组件槽")
  if (oldLevel < 7 && newLevel >= 7) unlocks.push("强化组件")
  if (oldLevel < 10 && newLevel >= 10) unlocks.push("称号")
  return unlocks
}

function generateTitle(card: Card) {
  const suffixByEffect: Record<string, string> = {
    burn: "余烬守望者",
    shield: "坚壳守卫",
    heal: "回春使者",
    speed_up: "疾风旅者",
    poison: "毒棘行者",
    regen: "再生之根",
    counter: "反击老兵",
    mark: "弱点猎手",
    cleanse: "净辉者",
  }

  return suffixByEffect[card.effect] ?? `${card.name.slice(0, 2)}老兵`
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword))
}
