import type { Card } from "@prisma/client"

export type ComponentSlot = "active" | "passive" | "upgrade"

export type ComponentDefinition = {
  id: string
  slot: ComponentSlot
  name: string
  unlockLevel: number
  tags: string[]
  summary: string
  ruleText: string
}

export const activeComponents: ComponentDefinition[] = [
  {
    id: "active_rule_core",
    slot: "active",
    name: "主动技能核心",
    unlockLevel: 1,
    tags: ["trigger", "condition", "selector", "effect"],
    summary: "卡牌的基础主动技能组件。",
    ruleText: "由触发、条件、目标、效果、强度和冷却组成，生成时即可参与战斗结算。",
  },
  {
    id: "active_status_core",
    slot: "active",
    name: "状态施加核心",
    unlockLevel: 1,
    tags: ["burn", "poison", "mark", "armor_break", "stun"],
    summary: "让主动技能附带可持续结算的状态。",
    ruleText: "灼烧、中毒、标记、破甲和震慑等效果会挂在目标身上，并在后续回合产生影响。",
  },
  {
    id: "active_survival_core",
    slot: "active",
    name: "生存技能核心",
    unlockLevel: 1,
    tags: ["shield", "heal", "regen", "cleanse"],
    summary: "让主动技能转向护盾、治疗、再生或净化。",
    ruleText: "自我类技能以自身为目标，帮助低血或防守型卡牌稳定存活。",
  },
]

export const passiveComponents: ComponentDefinition[] = [
  {
    id: "emergency_barrier",
    slot: "passive",
    name: "临界屏障",
    unlockLevel: 5,
    tags: ["low_hp", "shield"],
    summary: "低生命时获得护盾。",
    ruleText: "回合开始时，如果生命不高于 50%，获得护盾。",
  },
  {
    id: "battle_instinct",
    slot: "passive",
    name: "战斗本能",
    unlockLevel: 5,
    tags: ["battle_start", "focus"],
    summary: "开局进入蓄势状态。",
    ruleText: "战斗开始时获得蓄势，使下一次攻击伤害提高。",
  },
  {
    id: "quick_feet",
    slot: "passive",
    name: "轻足步法",
    unlockLevel: 5,
    tags: ["battle_start", "speed"],
    summary: "开局提升速度。",
    ruleText: "战斗开始时获得速度提升，更容易先手行动。",
  },
  {
    id: "self_repair",
    slot: "passive",
    name: "自我修复",
    unlockLevel: 5,
    tags: ["low_hp", "regen"],
    summary: "低生命时获得再生。",
    ruleText: "回合开始时，如果生命不高于 50%，获得持续再生。",
  },
]

export const upgradeComponents: ComponentDefinition[] = [
  {
    id: "cooling_core",
    slot: "upgrade",
    name: "冷却核心",
    unlockLevel: 7,
    tags: ["cooldown"],
    summary: "降低技能冷却。",
    ruleText: "技能触发后设置冷却时，冷却值 -1，最低为 0。",
  },
  {
    id: "status_amplifier",
    slot: "upgrade",
    name: "状态放大器",
    unlockLevel: 7,
    tags: ["status", "power"],
    summary: "强化状态类技能。",
    ruleText: "灼烧、中毒、标记、破甲类状态的强度或持续更高。",
  },
  {
    id: "piercing_edge",
    slot: "upgrade",
    name: "锐化边缘",
    unlockLevel: 7,
    tags: ["damage"],
    summary: "提高攻击类技能伤害。",
    ruleText: "直伤、连击、贯穿、收割和汲取类技能造成的伤害提高。",
  },
  {
    id: "steady_core",
    slot: "upgrade",
    name: "稳态核心",
    unlockLevel: 7,
    tags: ["survival", "power"],
    summary: "强化生存类技能。",
    ruleText: "护盾、治疗、再生、净化类技能的强度提高。",
  },
]

export const componentCatalog = [...activeComponents, ...passiveComponents, ...upgradeComponents]

export function pickPassiveComponent(card: Pick<Card, "effect" | "growthType" | "prompt">): string {
  if (card.growthType === "tank" || card.effect === "shield" || card.effect === "counter") return "emergency_barrier"
  if (card.growthType === "swift" || card.effect === "speed_up" || card.prompt.includes("风")) return "quick_feet"
  if (card.growthType === "support" || card.effect === "heal" || card.effect === "regen") return "self_repair"
  return "battle_instinct"
}

export function pickUpgradeComponent(card: Pick<Card, "effect" | "cooldown">): string {
  if (card.cooldown > 0) return "cooling_core"
  if (["burn", "poison", "mark", "armor_break", "stun"].includes(card.effect)) return "status_amplifier"
  if (["shield", "heal", "regen", "cleanse", "speed_up", "focus"].includes(card.effect)) return "steady_core"
  return "piercing_edge"
}

export function isPassiveEnabled(card: Pick<Card, "passiveUnlocked" | "passiveComponent">) {
  return Boolean(card.passiveUnlocked && card.passiveComponent)
}

export function isUpgradeEnabled(card: Pick<Card, "upgradeUnlocked" | "upgradeComponent">) {
  return Boolean(card.upgradeUnlocked && card.upgradeComponent)
}

export function getEffectiveCooldown(card: Pick<Card, "cooldown" | "upgradeUnlocked" | "upgradeComponent">) {
  if (isUpgradeEnabled(card) && card.upgradeComponent === "cooling_core") return Math.max(0, card.cooldown - 1)
  return card.cooldown
}

export function getEffectivePower(card: Pick<Card, "effect" | "effectPower" | "upgradeUnlocked" | "upgradeComponent">) {
  if (!isUpgradeEnabled(card)) return card.effectPower
  if (card.upgradeComponent === "status_amplifier" && ["burn", "poison", "mark", "armor_break", "stun"].includes(card.effect)) {
    return Math.min(6, card.effectPower + 1)
  }
  if (card.upgradeComponent === "steady_core" && ["shield", "heal", "regen", "cleanse", "speed_up", "focus"].includes(card.effect)) {
    return Math.min(6, card.effectPower + 1)
  }
  return card.effectPower
}

export function getSkillDamageBonus(card: Pick<Card, "effect" | "upgradeUnlocked" | "upgradeComponent">) {
  if (!isUpgradeEnabled(card) || card.upgradeComponent !== "piercing_edge") return 0
  return ["damage", "chain", "pierce", "execute", "lifesteal"].includes(card.effect) ? 2 : 0
}

export function getStatusDurationBonus(card: Pick<Card, "effect" | "upgradeUnlocked" | "upgradeComponent">) {
  if (!isUpgradeEnabled(card) || card.upgradeComponent !== "status_amplifier") return 0
  return ["burn", "poison", "mark", "armor_break", "stun"].includes(card.effect) ? 1 : 0
}

export function getComponentById(id: string | null | undefined) {
  if (!id) return undefined
  return componentCatalog.find((component) => component.id === id)
}
