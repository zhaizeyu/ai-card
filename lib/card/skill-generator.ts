import type { Rarity } from "./rarity"

export type Trigger = "battle_start" | "on_attack" | "on_hit" | "turn_start" | "low_hp" | "on_kill"
export type Condition =
  | "none"
  | "enemy_burning"
  | "enemy_statused"
  | "enemy_low_hp"
  | "self_low_hp"
  | "enemy_high_def"
  | "self_faster"
export type Selector = "enemy_single" | "self" | "lowest_hp_enemy" | "random_enemy"
export type Effect =
  | "damage"
  | "burn"
  | "armor_break"
  | "shield"
  | "heal"
  | "speed_up"
  | "lifesteal"
  | "stun"
  | "chain"
  | "pierce"
  | "execute"
  | "poison"
  | "regen"
  | "counter"
  | "focus"
  | "mark"
  | "cleanse"

export type SkillRule = {
  skillType: string
  trigger: Trigger
  condition: Condition
  selector: Selector
  effect: Effect
  effectPower: number
  cooldown: number
}

export type SkillProposal = Partial<Pick<SkillRule, "trigger" | "condition" | "selector" | "effect">>

export const effectCost: Record<Effect, number> = {
  damage: 2,
  burn: 3,
  armor_break: 3,
  shield: 3,
  heal: 4,
  speed_up: 3,
  lifesteal: 5,
  stun: 5,
  chain: 4,
  pierce: 4,
  execute: 5,
  poison: 4,
  regen: 4,
  counter: 5,
  focus: 3,
  mark: 3,
  cleanse: 4,
}

export const raritySkillBudget: Record<Rarity, number> = {
  common: 4,
  rare: 6,
  epic: 8,
  legendary: 10,
}

export const effectOptions = [
  "damage",
  "burn",
  "armor_break",
  "shield",
  "heal",
  "speed_up",
  "lifesteal",
  "stun",
  "chain",
  "pierce",
  "execute",
  "poison",
  "regen",
  "counter",
  "focus",
  "mark",
  "cleanse",
] as const satisfies readonly Effect[]
export const triggerOptions = ["battle_start", "on_attack", "on_hit", "turn_start", "low_hp", "on_kill"] as const satisfies readonly Trigger[]
export const conditionOptions = [
  "none",
  "enemy_burning",
  "enemy_statused",
  "enemy_low_hp",
  "self_low_hp",
  "enemy_high_def",
  "self_faster",
] as const satisfies readonly Condition[]
export const selectorOptions = ["enemy_single", "self", "lowest_hp_enemy", "random_enemy"] as const satisfies readonly Selector[]
const fallbackTriggers: Trigger[] = ["on_attack", "on_hit", "turn_start", "battle_start"]

export function generateSkill(rarity: Rarity, prompt = "", proposal: SkillProposal = {}): SkillRule {
  const budget = raritySkillBudget[rarity]
  const availableEffects = effectOptions.filter((effect) => effectCost[effect] <= budget)
  const proposedEffect = normalizeOption(proposal.effect, effectOptions)
  const effect = proposedEffect && availableEffects.includes(proposedEffect) ? proposedEffect : pickEffect(availableEffects, prompt)
  const remaining = budget - effectCost[effect]
  const trigger = normalizeTrigger(proposal.trigger, effect) ?? pickTrigger(effect, prompt)
  const condition = normalizeCondition(proposal.condition, trigger, effect, prompt) ?? pickCondition(trigger, effect, prompt)

  return {
    skillType: effect,
    trigger,
    condition,
    selector: normalizeSelector(proposal.selector, effect) ?? pickSelector(effect),
    effect,
    effectPower: Math.max(1, Math.min(5, 1 + remaining)),
    cooldown: effectCost[effect] >= 5 ? 2 : effectCost[effect] >= 4 ? 1 : 0,
  }
}

const selfEffects = new Set<Effect>(["heal", "shield", "speed_up", "regen", "counter", "focus", "cleanse"])

function pickEffect(availableEffects: Effect[], prompt: string): Effect {
  const weights = availableEffects.map((effect) => ({
    effect,
    weight: effectBaseWeights[effect] ?? 1,
  }))

  for (const hint of effectHints) {
    if (!hint.keywords.some((keyword) => prompt.includes(keyword))) continue

    for (const option of weights) {
      const boost = hint.weights[option.effect]
      if (boost) option.weight += boost
    }
  }

  return weightedPick(weights)
}

const effectBaseWeights: Record<Effect, number> = {
  damage: 1.1,
  burn: 0.75,
  armor_break: 0.95,
  shield: 1,
  heal: 0.85,
  speed_up: 1,
  lifesteal: 0.9,
  stun: 0.8,
  chain: 1,
  pierce: 1,
  execute: 0.85,
  poison: 0.9,
  regen: 0.9,
  counter: 0.9,
  focus: 1,
  mark: 1,
  cleanse: 0.85,
}

const effectHints: Array<{ keywords: string[]; weights: Partial<Record<Effect, number>> }> = [
  { keywords: ["连击", "多段", "爪击", "乱抓", "双击"], weights: { chain: 5, damage: 1.5, mark: 1.2 } },
  { keywords: ["穿透", "破防", "贯穿", "无视防御"], weights: { pierce: 5, armor_break: 3, mark: 1.5 } },
  { keywords: ["斩杀", "收割", "终结", "掉半血", "半血"], weights: { execute: 5, focus: 2, pierce: 1.2 } },
  { keywords: ["毒", "腐蚀", "剧毒", "孢子"], weights: { poison: 5, armor_break: 1.5, regen: 1.2 } },
  { keywords: ["闪电", "雷", "麻痹", "眩晕", "震荡"], weights: { stun: 4, speed_up: 2.5, chain: 1.5 } },
  { keywords: ["反击", "荆棘", "报复"], weights: { counter: 5, armor_break: 1.5, shield: 1.2 } },
  { keywords: ["标记", "弱点", "锁定"], weights: { mark: 5, execute: 2, pierce: 1.5 } },
  { keywords: ["吸血", "汲取", "吞噬"], weights: { lifesteal: 5, heal: 1.5, execute: 1.2 } },
  { keywords: ["护盾", "护甲", "屏障"], weights: { shield: 5, counter: 1.8, cleanse: 1.2 } },
  { keywords: ["治疗", "恢复", "再生"], weights: { heal: 4, regen: 3, cleanse: 1.5 } },
  { keywords: ["加速", "疾风", "迅捷"], weights: { speed_up: 5, chain: 1.8, focus: 1.3 } },
  { keywords: ["火", "燃烧", "灼烧", "火焰"], weights: { burn: 3, damage: 2.2, armor_break: 1.8, focus: 1.5, speed_up: 1.2 } },
  { keywords: ["冰", "霜", "冻结", "寒"], weights: { stun: 3, armor_break: 2, shield: 1.5, cleanse: 1 } },
  { keywords: ["影", "暗", "夜", "潜行"], weights: { mark: 3, lifesteal: 2.2, execute: 2, speed_up: 1.2 } },
  { keywords: ["光", "圣", "星", "月"], weights: { cleanse: 3, heal: 2.5, focus: 2, shield: 1.5 } },
  { keywords: ["岩", "石", "山", "钢"], weights: { shield: 3, armor_break: 2.5, counter: 2, pierce: 1.2 } },
  { keywords: ["水", "海", "潮", "雾"], weights: { regen: 2.5, speed_up: 2, cleanse: 2, poison: 1.2 } },
]

function pickTrigger(effect: Effect, prompt: string): Trigger {
  if (prompt.includes("开局") || prompt.includes("先手")) return "battle_start"
  if (effect === "shield" || effect === "counter") return weightedPick([{ effect: "on_hit", weight: 4 }, { effect: "battle_start", weight: 1.5 }])
  if (effect === "heal" || effect === "regen" || effect === "cleanse") return weightedPick([{ effect: "low_hp", weight: 4 }, { effect: "turn_start", weight: 1 }])
  if (effect === "speed_up" || effect === "focus") return weightedPick([{ effect: "battle_start", weight: 2 }, { effect: "turn_start", weight: 2 }, { effect: "on_attack", weight: 1 }])
  if (effect === "execute") return "on_attack"
  return fallbackTriggers[Math.floor(Math.random() * fallbackTriggers.length)]
}

function pickCondition(trigger: Trigger, effect: Effect, prompt: string): Condition {
  if (trigger === "battle_start" || prompt.includes("开局")) return "none"
  if (trigger === "low_hp") return "self_low_hp"
  if (effect === "execute") return "enemy_low_hp"
  if (effect === "mark") return "none"
  if (effect === "pierce" || effect === "armor_break") return weightedPick([{ effect: "enemy_high_def", weight: 2 }, { effect: "none", weight: 1 }])
  if (effect === "burn" || effect === "poison" || effect === "stun") return weightedPick([{ effect: "none", weight: 3 }, { effect: "enemy_statused", weight: 1 }])
  if (effect === "chain") return weightedPick([{ effect: "self_faster", weight: 2 }, { effect: "enemy_statused", weight: 1 }, { effect: "none", weight: 1 }])
  const options: Array<{ effect: Condition; weight: number }> = [
    { effect: "none", weight: 3 },
    { effect: "enemy_statused", weight: 1.2 },
    { effect: "enemy_high_def", weight: 1 },
    { effect: "self_faster", weight: 1 },
  ]
  return weightedPick(options)
}

function pickSelector(effect: Effect): Selector {
  if (selfEffects.has(effect)) return "self"
  if (effect === "execute") return "lowest_hp_enemy"
  if (effect === "chain" || effect === "stun") return weightedPick([{ effect: "enemy_single", weight: 2 }, { effect: "random_enemy", weight: 1 }])
  return "enemy_single"
}

function normalizeTrigger(value: unknown, effect: Effect): Trigger | undefined {
  const trigger = normalizeOption(value, triggerOptions)
  if (!trigger) return undefined
  if ((effect === "heal" || effect === "regen" || effect === "cleanse") && trigger === "on_attack") return undefined
  if (effect === "execute" && trigger !== "on_attack") return undefined
  if ((effect === "shield" || effect === "counter") && trigger === "on_attack") return undefined
  return trigger
}

function normalizeCondition(value: unknown, trigger: Trigger, effect: Effect, prompt: string): Condition | undefined {
  const condition = normalizeOption(value, conditionOptions)
  if (!condition) return undefined
  if (trigger === "battle_start" || prompt.includes("开局")) return "none"
  if (trigger === "low_hp") return "self_low_hp"
  if (effect === "execute") return "enemy_low_hp"
  if (effect === "mark") return condition === "self_low_hp" ? "none" : condition
  if (condition === "enemy_burning" && effect !== "damage" && effect !== "pierce") return undefined
  return condition
}

function normalizeSelector(value: unknown, effect: Effect): Selector | undefined {
  const selector = normalizeOption(value, selectorOptions)
  if (!selector) return undefined
  if (selfEffects.has(effect)) return "self"
  if (selector === "self") return undefined
  if (effect === "execute") return selector === "lowest_hp_enemy" ? selector : undefined
  return selector
}

function normalizeOption<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  if (typeof value !== "string") return undefined
  return options.includes(value as T) ? (value as T) : undefined
}

function weightedPick<T>(options: Array<{ effect: T; weight: number }>): T {
  const total = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0)
  let cursor = Math.random() * total

  for (const option of options) {
    cursor -= Math.max(0, option.weight)
    if (cursor <= 0) return option.effect
  }

  return options[options.length - 1].effect
}
