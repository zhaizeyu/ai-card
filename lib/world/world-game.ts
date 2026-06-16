import type { Card, ComponentReward, World, WorldCard, WorldEvent } from "@prisma/client"
import { createMonsterCard } from "@/lib/card/card-generator"
import { pickUpgradeComponent } from "@/lib/card/components"
import { applyCardProgression } from "@/lib/card/card-progression"
import { runTeamBattle } from "@/lib/battle/team-battle-engine"
import { buildBattleReward } from "@/lib/battle/rewards"
import { prisma } from "@/lib/db"

export const teamRoles = ["team_1", "team_2", "team_3"] as const

export type TeamRole = (typeof teamRoles)[number]

export type WorldEventPayload = {
  resource: number
  safety: number
  prosperity: number
  chaos: number
  fame: number
}

export type WorldRewardPayload = {
  exp: number
  resource: number
  fame: number
  componentChance: number
}

type EventTemplate = {
  type: string
  title: string
  description: string
  impact: WorldEventPayload
  reward: WorldRewardPayload
  enemyPrompts: string[]
}

const eventTemplates: EventTemplate[] = [
  {
    type: "invasion",
    title: "边境入侵",
    description: "一支受混沌侵蚀的小队正在冲击世界边境。派出主力队伍可以稳定安全值并获得战斗奖励。",
    impact: { resource: -2, safety: 7, prosperity: 1, chaos: -4, fame: 2 },
    reward: { exp: 12, resource: 2, fame: 2, componentChance: 0.65 },
    enemyPrompts: ["锈甲侵袭者", "裂角蛮兵", "黑雾旗手"],
  },
  {
    type: "expedition",
    title: "遗迹探索",
    description: "远处出现了半埋的古代遗迹。探索能带来资源和声望，但敌人更偏向控制与消耗。",
    impact: { resource: 8, safety: -2, prosperity: 2, chaos: 1, fame: 2 },
    reward: { exp: 10, resource: 8, fame: 2, componentChance: 0.55 },
    enemyPrompts: ["古代守卫", "回声灯灵", "尘封符偶"],
  },
  {
    type: "construction",
    title: "工坊扩建",
    description: "居民请求怪物伙伴协助扩建工坊。战斗风险较低，胜利后世界繁荣会明显提升。",
    impact: { resource: -4, safety: 1, prosperity: 8, chaos: -1, fame: 1 },
    reward: { exp: 9, resource: 1, fame: 1, componentChance: 0.45 },
    enemyPrompts: ["失控搬运魔像", "噪音齿轮怪", "煤烟小妖"],
  },
  {
    type: "crisis",
    title: "混沌裂隙",
    description: "混沌裂隙短暂打开，强敌会从中涌出。处理成功会大幅降低混沌并解锁更高声望。",
    impact: { resource: -3, safety: 4, prosperity: 0, chaos: -9, fame: 4 },
    reward: { exp: 15, resource: 3, fame: 4, componentChance: 0.75 },
    enemyPrompts: ["裂隙吞光兽", "错位影法师", "混沌鳞卫"],
  },
]

export async function getOrCreateWorld() {
  const existing = await prisma.world.findFirst({ orderBy: { createdAt: "asc" } })
  if (existing) return existing

  const world = await prisma.world.create({
    data: {
      name: "初生边境",
      theme: "怪物伙伴聚落",
      description: "一个由 AI 怪物伙伴守护、探索和建设的小世界。",
    },
  })
  await createWorldEvent(world)
  return world
}

export async function assignTeamCard(worldId: string, role: TeamRole, cardId: string) {
  if (!teamRoles.includes(role)) throw new Error("未知队伍位置")

  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card) throw new Error("卡牌不存在")

  await prisma.worldCard.deleteMany({
    where: {
      worldId,
      OR: [{ role }, { cardId, role: { in: [...teamRoles] } }],
    },
  })

  return prisma.worldCard.create({
    data: {
      worldId,
      cardId,
      role,
    },
  })
}

export async function advanceWorldDay(worldId: string) {
  const world = await prisma.world.findUnique({ where: { id: worldId } })
  if (!world) throw new Error("小世界不存在")

  const pending = await prisma.worldEvent.findFirst({ where: { worldId, status: "pending" } })
  if (pending) throw new Error("还有未处理事件")

  const updated = await prisma.world.update({
    where: { id: worldId },
    data: {
      day: { increment: 1 },
      resource: clampStat(world.resource + 2),
      prosperity: clampStat(world.prosperity + (world.chaos > 45 ? -1 : 1)),
      safety: clampStat(world.safety + (world.chaos > 50 ? -2 : 1)),
      chaos: clampStat(world.chaos + 2),
    },
  })

  await createWorldEvent(updated)
  return updated
}

export async function resolveWorldEvent(eventId: string, approach: "fight" | "caution" | "negotiate") {
  const event = await prisma.worldEvent.findUnique({
    where: { id: eventId },
    include: { world: true },
  })
  if (!event) throw new Error("事件不存在")
  if (event.status !== "pending") throw new Error("事件已经处理")

  if (approach !== "fight") {
    return resolveCheckEvent(event, approach)
  }

  const teamRows = await getWorldTeamRows(event.worldId)
  if (teamRows.length !== 3) throw new Error("需要先配置 3 张主力卡")

  const template = getTemplateForEvent(event)
  const enemyCards = await Promise.all(
    template.enemyPrompts.map((prompt) => createMonsterCard(`${prompt} Lv.${event.difficulty}`, { useAi: false })),
  )
  const team = teamRows.map((row) => row.card)
  const bondBonus = getTeamBondBonus(teamRows)
  const outcome = runTeamBattle(applyBondBonus(team, bondBonus), enemyCards)
  if (bondBonus > 0) {
    outcome.log.splice(1, 0, `主力队伍羁绊产生共鸣，全队生命和攻击提升 ${bondBonus}%。`)
  }
  const playerWon = outcome.result === "win"
  const reward = buildWorldBattleReward(team, enemyCards, outcome.result, getReward(event))
  reward.bondGained = outcome.result === "win" ? 5 : outcome.result === "draw" ? 3 : 2
  reward.teamBond = teamRows.map((row) => ({
    cardId: row.cardId,
    bond: Math.min(100, row.bond + reward.bondGained),
  }))

  if (playerWon || outcome.result === "draw") {
    await applyWorldImpact(event.worldId, getImpact(event), getReward(event), outcome.result)
  } else {
    await applyWorldSetback(event.worldId, event.difficulty)
  }

  for (const card of team) {
    const progression = applyCardProgression(card, outcome.result, reward.exp)
    await prisma.card.update({
      where: { id: card.id },
      data: {
        exp: progression.exp,
        level: progression.level,
        hp: progression.hp,
        atk: progression.atk,
        def: progression.def,
        spd: progression.spd,
        powerScore: progression.hp + progression.atk * 4 + progression.def * 3 + progression.spd * 3,
        effectPower: progression.effectPower,
        cooldown: progression.cooldown,
        title: progression.title,
        passiveUnlocked: progression.passiveUnlocked,
        upgradeUnlocked: progression.upgradeUnlocked,
        wins: outcome.result === "win" ? { increment: 1 } : undefined,
        losses: outcome.result === "loss" ? { increment: 1 } : undefined,
      },
    })
    reward.team.push({
      cardId: card.id,
      exp: reward.exp,
      levelsGained: progression.levelsGained,
      level: progression.level,
      unlocked: progression.unlocked,
      title: progression.title,
    })
  }

  await growTeamBond(event.worldId, reward.bondGained)

  const battle = await prisma.battle.create({
    data: {
      playerCardId: team[0].id,
      enemyCardId: enemyCards[0].id,
      worldEventId: event.id,
      mode: "team",
      result: outcome.result,
      winnerCardId: outcome.winnerCardId,
      loserCardId: outcome.loserCardId,
      playerTeamJson: JSON.stringify(outcome.playerTeam),
      enemyTeamJson: JSON.stringify(outcome.enemyTeam),
      battleLog: JSON.stringify(outcome.log),
      rewardJson: JSON.stringify(reward),
    },
  })

  if (reward.component && outcome.result === "win") {
    await prisma.componentReward.create({ data: reward.component })
  }

  await prisma.worldEvent.update({
    where: { id: event.id },
    data: {
      status: "completed",
      result: outcome.result,
    },
  })

  return { battleId: battle.id, result: outcome.result }
}

export async function equipComponent(componentId: string, cardId: string) {
  const [component, card] = await Promise.all([
    prisma.componentReward.findUnique({ where: { id: componentId } }),
    prisma.card.findUnique({ where: { id: cardId } }),
  ])

  if (!component) throw new Error("组件不存在")
  if (!card) throw new Error("卡牌不存在")
  if (!card.upgradeUnlocked) throw new Error("卡牌 Lv.7 后才能装配强化组件")

  const upgradeComponent = pickUpgradeComponent({
    effect: component.effect,
    cooldown: component.effect === "cooldown" ? 1 : card.cooldown,
  })

  return prisma.$transaction(async (tx) => {
    await tx.componentReward.updateMany({
      where: {
        equippedCardId: card.id,
        equippedSlot: "upgrade",
      },
      data: {
        equippedCardId: null,
        equippedSlot: null,
      },
    })

    await tx.componentReward.update({
      where: { id: component.id },
      data: {
        equippedCardId: card.id,
        equippedSlot: "upgrade",
      },
    })

    return tx.card.update({
      where: { id: card.id },
      data: { upgradeComponent },
    })
  })
}

export async function trainTeamBond(worldId: string) {
  const world = await prisma.world.findUnique({ where: { id: worldId } })
  if (!world) throw new Error("小世界不存在")

  const team = await getWorldTeamRows(worldId)
  if (team.length !== 3) throw new Error("需要先配置 3 张主力卡")
  if (world.resource < 4) throw new Error("资源不足，至少需要 4 点资源")

  await prisma.$transaction(async (tx) => {
    await tx.world.update({
      where: { id: worldId },
      data: {
        resource: clampStat(world.resource - 4),
        safety: clampStat(world.safety + 1),
        chaos: clampStat(world.chaos - 1),
      },
    })

    for (const row of team) {
      await tx.worldCard.update({
        where: { id: row.id },
        data: { bond: Math.min(100, row.bond + 4) },
      })
    }
  })
}

export async function getWorldTeam(worldId: string) {
  const rows = await getWorldTeamRows(worldId)
  return rows.map((row) => row.card)
}

export async function getWorldTeamRows(worldId: string) {
  const rows = await prisma.worldCard.findMany({
    where: { worldId, role: { in: [...teamRoles] } },
    include: { card: true },
  })

  return teamRoles
    .map((role) => rows.find((row) => row.role === role))
    .filter((row): row is WorldCard & { card: Card } => Boolean(row))
}

function createWorldEvent(world: World) {
  const template = eventTemplates[(world.day - 1) % eventTemplates.length]
  const difficulty = Math.max(1, Math.min(10, Math.floor(world.day / 2) + 1 + Math.floor(world.chaos / 35)))

  return prisma.worldEvent.create({
    data: {
      worldId: world.id,
      day: world.day,
      type: template.type,
      title: template.title,
      description: template.description,
      difficulty,
      impactJson: JSON.stringify(template.impact),
      rewardJson: JSON.stringify(template.reward),
    },
  })
}

function resolveCheckEvent(event: WorldEvent & { world: World }, approach: "caution" | "negotiate") {
  const impact = getImpact(event)
  const reward = getReward(event)
  const score =
    approach === "caution"
      ? event.world.safety + event.world.resource - event.world.chaos
      : event.world.prosperity + event.world.fame - Math.floor(event.world.chaos / 2)
  const success = score + Math.floor(Math.random() * 30) >= 38 + event.difficulty * 3

  if (success) {
    return prisma.$transaction(async (tx) => {
      await tx.world.update({
        where: { id: event.worldId },
        data: {
          resource: clampStat(event.world.resource + Math.ceil(reward.resource / 2)),
          prosperity: clampStat(event.world.prosperity + Math.ceil(impact.prosperity / 2)),
          safety: clampStat(event.world.safety + Math.ceil(impact.safety / 2)),
          chaos: clampStat(event.world.chaos + Math.min(0, Math.ceil(impact.chaos / 2))),
          fame: clampStat(event.world.fame + Math.ceil(reward.fame / 2)),
        },
      })
      await tx.worldEvent.update({
        where: { id: event.id },
        data: { status: "completed", result: "success" },
      })
      return { result: "success" }
    })
  }

  return prisma.$transaction(async (tx) => {
    await tx.world.update({
      where: { id: event.worldId },
      data: {
        resource: clampStat(event.world.resource - event.difficulty),
        safety: clampStat(event.world.safety - 2),
        chaos: clampStat(event.world.chaos + event.difficulty),
      },
    })
    await tx.worldEvent.update({
      where: { id: event.id },
      data: { status: "completed", result: "failed" },
    })
    return { result: "failed" }
  })
}

async function applyWorldImpact(worldId: string, impact: WorldEventPayload, reward: WorldRewardPayload, result: "win" | "loss" | "draw") {
  const multiplier = result === "win" ? 1 : 0.5
  const world = await prisma.world.findUnique({ where: { id: worldId } })
  if (!world) return

  await prisma.world.update({
    where: { id: worldId },
    data: {
      resource: clampStat(world.resource + Math.round((impact.resource + reward.resource) * multiplier)),
      safety: clampStat(world.safety + Math.round(impact.safety * multiplier)),
      prosperity: clampStat(world.prosperity + Math.round(impact.prosperity * multiplier)),
      chaos: clampStat(world.chaos + Math.round(impact.chaos * multiplier)),
      fame: clampStat(world.fame + Math.round((impact.fame + reward.fame) * multiplier)),
    },
  })
}

async function applyWorldSetback(worldId: string, difficulty: number) {
  const world = await prisma.world.findUnique({ where: { id: worldId } })
  if (!world) return

  await prisma.world.update({
    where: { id: worldId },
    data: {
      resource: clampStat(world.resource - difficulty),
      safety: clampStat(world.safety - 3),
      chaos: clampStat(world.chaos + difficulty + 2),
    },
  })
}

function buildWorldBattleReward(
  team: Card[],
  enemyCards: Card[],
  result: "win" | "loss" | "draw",
  worldReward: WorldRewardPayload,
) {
  const reference = result === "win" ? team[0] : enemyCards[0]
  const battleReward = buildBattleReward(reference, result)
  const component =
    result === "win" && Math.random() < worldReward.componentChance
      ? battleReward.component
      : result === "win"
        ? null
        : battleReward.component

  return {
    exp: result === "win" ? worldReward.exp : result === "draw" ? Math.ceil(worldReward.exp / 2) : 4,
    resource: result === "win" ? worldReward.resource : 0,
    fame: result === "win" ? worldReward.fame : 0,
    component,
    bondGained: 0,
    teamBond: [] as Array<{ cardId: string; bond: number }>,
    team: [] as Array<{
      cardId: string
      exp: number
      levelsGained: number
      level: number
      unlocked: string[]
      title?: string | null
    }>,
  }
}

async function growTeamBond(worldId: string, amount: number) {
  if (amount <= 0) return

  const team = await getWorldTeamRows(worldId)
  await Promise.all(
    team.map((row) =>
      prisma.worldCard.update({
        where: { id: row.id },
        data: { bond: Math.min(100, row.bond + amount) },
      }),
    ),
  )
}

function getTeamBondBonus(team: Array<WorldCard & { card: Card }>) {
  if (team.length < 3) return 0
  const averageBond = team.reduce((sum, row) => sum + row.bond, 0) / team.length
  return Math.min(18, Math.floor(averageBond / 10) * 2)
}

function applyBondBonus(team: Card[], bonusPercent: number): Card[] {
  if (bonusPercent <= 0) return team
  const multiplier = 1 + bonusPercent / 100

  return team.map((card) => ({
    ...card,
    hp: Math.round(card.hp * multiplier),
    atk: Math.round(card.atk * multiplier),
  }))
}

function getTemplateForEvent(event: Pick<WorldEvent, "type">) {
  return eventTemplates.find((template) => template.type === event.type) ?? eventTemplates[0]
}

function getImpact(event: Pick<WorldEvent, "impactJson" | "type">): WorldEventPayload {
  if (event.impactJson) return JSON.parse(event.impactJson) as WorldEventPayload
  return getTemplateForEvent(event).impact
}

function getReward(event: Pick<WorldEvent, "rewardJson" | "type">): WorldRewardPayload {
  if (event.rewardJson) return JSON.parse(event.rewardJson) as WorldRewardPayload
  return getTemplateForEvent(event).reward
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function getComponentEquipLabel(component: Pick<ComponentReward, "equippedCardId" | "equippedSlot">) {
  if (!component.equippedCardId) return "未装配"
  return component.equippedSlot === "upgrade" ? "已装配强化槽" : "已装配"
}
