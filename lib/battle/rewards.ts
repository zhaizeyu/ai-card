import type { Card } from "@prisma/client"

const rewardNames = {
  damage: "裂击核心",
  burn: "余烬组件",
  armor_break: "破甲齿轮",
  shield: "护盾晶片",
  heal: "再生孢子",
  speed_up: "疾风羽片",
  lifesteal: "汲魂棱镜",
  stun: "震荡铃舌",
  chain: "连击爪套",
  pierce: "贯穿尖晶",
  execute: "收割刻印",
  poison: "毒腺孢子",
  regen: "再生根须",
  counter: "反击棘片",
  focus: "蓄势棱石",
  mark: "弱点透镜",
  cleanse: "净化露珠",
} as const

export function buildBattleReward(winner: Card, result: "win" | "loss" | "draw") {
  const exp = result === "win" ? 12 : result === "draw" ? 6 : 4
  const componentChance = result === "win" ? 0.55 : 0.15
  const component =
    Math.random() < componentChance
      ? {
          name: rewardNames[winner.effect as keyof typeof rewardNames] ?? "野性组件",
          type: "skill_component",
          rarity: winner.rarity,
          description: "可在后续版本用于改造卡牌技能组件。",
          effect: winner.effect,
          cost: Math.max(1, winner.effectPower),
        }
      : null

  return { exp, component }
}
