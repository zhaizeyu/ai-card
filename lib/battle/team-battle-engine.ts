import type { Card } from "@prisma/client"
import {
  getEffectiveCooldown,
  getEffectivePower,
  getSkillDamageBonus,
  getStatusDurationBonus,
  isPassiveEnabled,
} from "@/lib/card/components"
import { calculateDamage } from "./damage"
import { addStatus, getStatus, removeStatus, tickStatuses, type FighterStatus } from "./status-effects"

type Side = "player" | "enemy"

type TeamFighter = {
  side: Side
  position: number
  card: Card
  hp: number
  maxHp: number
  cooldown: number
  statuses: FighterStatus
  skipped: boolean
}

type TeamSnapshot = {
  cardId: string
  name: string
  position: number
  hp: number
  maxHp: number
  alive: boolean
}

export type TeamBattleOutcome = {
  result: "win" | "loss" | "draw"
  winnerCardId?: string
  loserCardId?: string
  log: string[]
  playerTeam: TeamSnapshot[]
  enemyTeam: TeamSnapshot[]
}

export function runTeamBattle(playerCards: Card[], enemyCards: Card[]): TeamBattleOutcome {
  const playerTeam = playerCards.slice(0, 3).map((card, index) => makeFighter("player", card, index))
  const enemyTeam = enemyCards.slice(0, 3).map((card, index) => makeFighter("enemy", card, index))
  const log: string[] = []

  log.push(`小队战斗开始：${formatTeam(playerTeam)} 对阵 ${formatTeam(enemyTeam)}。`)
  for (const fighter of [...playerTeam, ...enemyTeam]) {
    applyBattleStartPassive(fighter, log)
  }
  for (const fighter of [...playerTeam, ...enemyTeam]) {
    const target = selectTarget(fighter, getEnemies(fighter, playerTeam, enemyTeam))
    if (target) processBattleStart(fighter, target, log)
  }

  for (let round = 1; round <= 12; round += 1) {
    log.push(`第 ${round} 回合开始。`)

    for (const fighter of getLivingFighters([...playerTeam, ...enemyTeam])) {
      const target = selectTarget(fighter, getEnemies(fighter, playerTeam, enemyTeam))
      processTurnStart(fighter, target, log)
    }

    if (isTeamDefeated(playerTeam) || isTeamDefeated(enemyTeam)) break

    const order = getLivingFighters([...playerTeam, ...enemyTeam]).sort((a, b) => {
      const speedDiff = currentSpeed(b) - currentSpeed(a)
      if (speedDiff !== 0) return speedDiff
      const positionDiff = a.position - b.position
      if (positionDiff !== 0) return positionDiff
      return a.side === "player" ? -1 : 1
    })

    for (const actor of order) {
      if (isDefeated(actor)) continue
      const enemies = getEnemies(actor, playerTeam, enemyTeam)
      const target = selectTarget(actor, enemies)
      if (!target) break

      act(actor, target, playerTeam, enemyTeam, log)
      if (isDefeated(target)) log.push(`${actor.card.name} 击败了 ${target.card.name}。`)
      if (isTeamDefeated(playerTeam) || isTeamDefeated(enemyTeam)) break
    }

    for (const fighter of [...playerTeam, ...enemyTeam]) {
      fighter.statuses = tickStatuses(fighter.statuses)
      fighter.cooldown = Math.max(0, fighter.cooldown - 1)
    }

    if (isTeamDefeated(playerTeam) || isTeamDefeated(enemyTeam)) break
  }

  const result = resolveTeamResult(playerTeam, enemyTeam)
  if (result === "draw") {
    log.push("双方未能彻底击溃对手，战斗以平局结束。")
  } else {
    log.push(`战斗结束：${result === "win" ? "玩家小队" : "敌方小队"} 获胜。`)
  }

  const winner = getLivingFighters(result === "win" ? playerTeam : result === "loss" ? enemyTeam : []).at(0)
  const loser = getDefeatedFighters(result === "win" ? enemyTeam : result === "loss" ? playerTeam : []).at(0)

  return {
    result,
    winnerCardId: winner?.card.id,
    loserCardId: loser?.card.id,
    log,
    playerTeam: snapshotTeam(playerTeam),
    enemyTeam: snapshotTeam(enemyTeam),
  }
}

function makeFighter(side: Side, card: Card, position: number): TeamFighter {
  return {
    side,
    position,
    card,
    hp: card.hp,
    maxHp: card.hp,
    cooldown: 0,
    statuses: [],
    skipped: false,
  }
}

function processBattleStart(fighter: TeamFighter, target: TeamFighter, log: string[]) {
  if (fighter.card.trigger !== "battle_start" || isDefeated(fighter)) return
  log.push(`${fighter.card.name} 抢先发动开局技能。`)
  executeSkill(fighter, target, log)
}

function processTurnStart(fighter: TeamFighter, target: TeamFighter | undefined, log: string[]) {
  if (isDefeated(fighter)) return

  const burn = getStatus(fighter.statuses, "burn")
  if (burn) {
    const damage = Math.min(fighter.hp, 2 + Math.floor(Math.random() * 3) + Math.max(0, burn.power - 1))
    fighter.hp -= damage
    log.push(`${fighter.card.name} 受到灼烧，损失 ${damage} 点生命。`)
  }

  const poison = getStatus(fighter.statuses, "poison")
  if (poison) {
    const damage = Math.min(fighter.hp, 1 + poison.power + Math.floor(Math.random() * 2))
    fighter.hp -= damage
    log.push(`${fighter.card.name} 受到毒素侵蚀，损失 ${damage} 点生命。`)
  }

  const regen = getStatus(fighter.statuses, "regen")
  if (regen && fighter.hp > 0) {
    const amount = Math.min(fighter.maxHp - fighter.hp, 1 + regen.power)
    fighter.hp += amount
    log.push(`${fighter.card.name} 的再生恢复了 ${amount} 点生命。`)
  }

  applyTurnStartPassive(fighter, log)

  if (target && fighter.card.trigger === "turn_start" && shouldTrigger(fighter, target, "turn_start")) {
    executeSkill(fighter, target, log)
  }
}

function act(actor: TeamFighter, defaultTarget: TeamFighter, playerTeam: TeamFighter[], enemyTeam: TeamFighter[], log: string[]) {
  const stun = getStatus(actor.statuses, "stun")
  if (stun && !actor.skipped) {
    actor.skipped = true
    actor.statuses = removeStatus(actor.statuses, "stun")
    log.push(`${actor.card.name} 被震慑，跳过了这次行动。`)
    return
  }

  actor.skipped = false
  const target = selectTarget(actor, getEnemies(actor, playerTeam, enemyTeam)) ?? defaultTarget

  if (actor.card.trigger !== "turn_start" && actor.cooldown === 0 && shouldTrigger(actor, target, actor.card.trigger)) {
    executeSkill(actor, target, log)
    actor.cooldown = getEffectiveCooldown(actor.card)
    return
  }

  const damage = applyDamage(target, calculateDamage(actor.card, target.card), log, actor)
  log.push(`${actor.card.name} 普通攻击 ${target.card.name}，造成 ${damage} 点伤害。`)
}

function shouldTrigger(actor: TeamFighter, target: TeamFighter, trigger: string): boolean {
  if (trigger === "battle_start") return false
  if (trigger === "on_attack") return checkCondition(actor, target)
  if (trigger === "turn_start") return checkCondition(actor, target)
  if (trigger === "low_hp") return actor.hp / actor.maxHp <= 0.5 && checkCondition(actor, target)
  if (trigger === "on_hit") return actor.hp / actor.maxHp <= 0.7 && checkCondition(actor, target)
  if (trigger === "on_kill") return false
  return false
}

function checkCondition(actor: TeamFighter, target: TeamFighter): boolean {
  const condition = actor.card.condition
  if (condition === "none") return true
  if (condition === "enemy_burning") return Boolean(getStatus(target.statuses, "burn"))
  if (condition === "enemy_statused") return target.statuses.length > 0
  if (condition === "enemy_low_hp") return target.hp / target.maxHp <= 0.5
  if (condition === "self_low_hp") return actor.hp / actor.maxHp <= 0.5
  if (condition === "enemy_high_def") return target.card.def >= actor.card.atk
  if (condition === "self_faster") return currentSpeed(actor) >= currentSpeed(target)
  return true
}

function applyBattleStartPassive(fighter: TeamFighter, log: string[]) {
  if (!isPassiveEnabled(fighter.card)) return

  if (fighter.card.passiveComponent === "battle_instinct") {
    fighter.statuses = addStatus(fighter.statuses, { name: "focus", turns: 2, power: 1 })
    log.push(`${fighter.card.name} 的被动【战斗本能】发动，进入蓄势。`)
  } else if (fighter.card.passiveComponent === "quick_feet") {
    fighter.statuses = addStatus(fighter.statuses, { name: "speed_up", turns: 2, power: 2 })
    log.push(`${fighter.card.name} 的被动【轻足步法】发动，速度提升。`)
  }
}

function applyTurnStartPassive(fighter: TeamFighter, log: string[]) {
  if (!isPassiveEnabled(fighter.card) || fighter.hp <= 0 || fighter.hp / fighter.maxHp > 0.5) return

  if (fighter.card.passiveComponent === "emergency_barrier") {
    fighter.statuses = addStatus(fighter.statuses, { name: "shield", turns: 1, power: 4 })
    log.push(`${fighter.card.name} 的被动【临界屏障】发动，获得护盾。`)
  } else if (fighter.card.passiveComponent === "self_repair") {
    fighter.statuses = addStatus(fighter.statuses, { name: "regen", turns: 2, power: 1 })
    log.push(`${fighter.card.name} 的被动【自我修复】发动，获得再生。`)
  }
}

function executeSkill(actor: TeamFighter, target: TeamFighter, log: string[]) {
  const effect = actor.card.effect
  const power = getEffectivePower(actor.card)
  const durationBonus = getStatusDurationBonus(actor.card)

  if (effect === "shield") {
    actor.statuses = addStatus(actor.statuses, { name: "shield", turns: 2, power: 3 + power })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，获得 ${3 + power} 点护盾。`)
    return
  }

  if (effect === "heal") {
    const amount = Math.min(actor.maxHp - actor.hp, 4 + power * 2)
    actor.hp += amount
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，恢复 ${amount} 点生命。`)
    return
  }

  if (effect === "speed_up") {
    actor.statuses = addStatus(actor.statuses, { name: "speed_up", turns: 2, power: 2 + power })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，速度暂时提升。`)
    return
  }

  if (effect === "regen") {
    actor.statuses = addStatus(actor.statuses, { name: "regen", turns: 3 + durationBonus, power })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，获得持续再生。`)
    return
  }

  if (effect === "counter") {
    actor.statuses = addStatus(actor.statuses, { name: "counter", turns: 2, power })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，进入反击姿态。`)
    return
  }

  if (effect === "focus") {
    actor.statuses = addStatus(actor.statuses, { name: "focus", turns: 2, power })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，下一次攻击蓄势增强。`)
    return
  }

  if (effect === "cleanse") {
    const removed = actor.statuses.filter((status) => ["burn", "poison", "armor_break", "mark", "stun"].includes(status.name))
    actor.statuses = actor.statuses.filter((status) => !removed.includes(status))
    const amount = Math.min(actor.maxHp - actor.hp, 2 + power)
    actor.hp += amount
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】，净化 ${removed.length} 个负面状态并恢复 ${amount} 点生命。`)
    return
  }

  if (effect === "chain") {
    const first = applyDamage(target, calculateDamage(actor.card, target.card, effect) + getSkillDamageBonus(actor.card), log, actor)
    const second = applyDamage(target, calculateDamage(actor.card, target.card, effect) + getSkillDamageBonus(actor.card), log, actor)
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】连续攻击 ${target.card.name}，造成 ${first + second} 点总伤害。`)
    return
  }

  if (effect === "pierce") {
    const damage = applyDamage(target, calculateDamage(actor.card, target.card, effect, -target.card.def) + getSkillDamageBonus(actor.card), log, actor, {
      bypassShield: true,
    })
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】贯穿 ${target.card.name}，造成 ${damage} 点伤害。`)
    return
  }

  if (effect === "execute") {
    const missingHpBonus = Math.floor((1 - target.hp / target.maxHp) * (3 + power * 2))
    const damage = applyDamage(target, calculateDamage(actor.card, target.card, effect) + missingHpBonus + getSkillDamageBonus(actor.card), log, actor)
    log.push(`${actor.card.name} 使用【${actor.card.skillName}】追击虚弱目标，造成 ${damage} 点伤害。`)
    return
  }

  const defModifier = getStatus(target.statuses, "armor_break") ? -2 : 0
  const damage = applyDamage(target, calculateDamage(actor.card, target.card, effect, defModifier) + getSkillDamageBonus(actor.card), log, actor)
  log.push(`${actor.card.name} 使用【${actor.card.skillName}】攻击 ${target.card.name}，造成 ${damage} 点伤害。`)

  if (effect === "burn") {
    target.statuses = addStatus(target.statuses, { name: "burn", turns: 2 + durationBonus, power })
    log.push(`${target.card.name} 被点燃。`)
  } else if (effect === "armor_break") {
    target.statuses = addStatus(target.statuses, { name: "armor_break", turns: 2 + durationBonus, power: 2 + durationBonus })
    log.push(`${target.card.name} 的防御被削弱。`)
  } else if (effect === "lifesteal") {
    const heal = Math.min(actor.maxHp - actor.hp, Math.ceil(damage / 2))
    actor.hp += heal
    log.push(`${actor.card.name} 汲取生命，恢复 ${heal} 点生命。`)
  } else if (effect === "stun" && Math.random() < 0.35) {
    target.statuses = addStatus(target.statuses, { name: "stun", turns: 1, power: 1 })
    log.push(`${target.card.name} 被震慑。`)
  } else if (effect === "poison") {
    target.statuses = addStatus(target.statuses, { name: "poison", turns: 3 + durationBonus, power })
    log.push(`${target.card.name} 中毒了。`)
  } else if (effect === "mark") {
    target.statuses = addStatus(target.statuses, { name: "mark", turns: 3 + durationBonus, power })
    log.push(`${target.card.name} 被标记为弱点。`)
  }
}

function applyDamage(
  target: TeamFighter,
  amount: number,
  log: string[],
  attacker?: TeamFighter,
  options: { bypassShield?: boolean } = {},
): number {
  const mark = getStatus(target.statuses, "mark")
  const focus = attacker ? getStatus(attacker.statuses, "focus") : undefined
  let finalAmount = Math.min(target.hp, amount + (mark ? mark.power : 0) + (focus ? focus.power * 2 : 0))

  if (focus && attacker) {
    attacker.statuses = removeStatus(attacker.statuses, "focus")
    log.push(`${attacker.card.name} 的蓄势爆发，伤害提升。`)
  }

  const shield = getStatus(target.statuses, "shield")
  if (shield && !options.bypassShield) {
    const absorbed = Math.min(shield.power, finalAmount)
    shield.power -= absorbed
    finalAmount -= absorbed
    target.hp -= finalAmount
    log.push(`${target.card.name} 的护盾吸收了 ${absorbed} 点伤害。`)
    triggerCounter(target, attacker, log)
    return finalAmount
  }

  target.hp -= finalAmount
  triggerCounter(target, attacker, log)
  return finalAmount
}

function triggerCounter(target: TeamFighter, attacker: TeamFighter | undefined, log: string[]) {
  const counter = getStatus(target.statuses, "counter")
  if (!counter || !attacker || target.hp <= 0 || attacker.hp <= 0) return

  const damage = Math.min(attacker.hp, 1 + counter.power + Math.floor(target.card.def / 3))
  attacker.hp -= damage
  counter.power -= 1
  log.push(`${target.card.name} 反击 ${attacker.card.name}，造成 ${damage} 点伤害。`)
}

function selectTarget(actor: TeamFighter, enemies: TeamFighter[]): TeamFighter | undefined {
  const living = getLivingFighters(enemies)
  if (!living.length) return undefined
  if (actor.card.selector === "lowest_hp_enemy") return living.toSorted((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
  if (actor.card.selector === "random_enemy") return living[Math.floor(Math.random() * living.length)]
  return living.toSorted((a, b) => a.position - b.position)[0]
}

function getEnemies(actor: TeamFighter, playerTeam: TeamFighter[], enemyTeam: TeamFighter[]) {
  return actor.side === "player" ? enemyTeam : playerTeam
}

function getLivingFighters(fighters: TeamFighter[]) {
  return fighters.filter((fighter) => !isDefeated(fighter))
}

function getDefeatedFighters(fighters: TeamFighter[]) {
  return fighters.filter(isDefeated)
}

function isDefeated(fighter: TeamFighter) {
  return fighter.hp <= 0
}

function isTeamDefeated(team: TeamFighter[]) {
  return team.every(isDefeated)
}

function currentSpeed(fighter: TeamFighter) {
  return fighter.card.spd + (getStatus(fighter.statuses, "speed_up")?.power ?? 0)
}

function resolveTeamResult(playerTeam: TeamFighter[], enemyTeam: TeamFighter[]): TeamBattleOutcome["result"] {
  if (isTeamDefeated(playerTeam) && isTeamDefeated(enemyTeam)) return "draw"
  if (isTeamDefeated(enemyTeam)) return "win"
  if (isTeamDefeated(playerTeam)) return "loss"

  const playerHp = remainingHp(playerTeam)
  const enemyHp = remainingHp(enemyTeam)
  if (Math.abs(playerHp - enemyHp) <= 3) return "draw"
  return playerHp > enemyHp ? "win" : "loss"
}

function remainingHp(team: TeamFighter[]) {
  return team.reduce((sum, fighter) => sum + Math.max(0, fighter.hp), 0)
}

function snapshotTeam(team: TeamFighter[]): TeamSnapshot[] {
  return team.map((fighter) => ({
    cardId: fighter.card.id,
    name: fighter.card.name,
    position: fighter.position,
    hp: Math.max(0, fighter.hp),
    maxHp: fighter.maxHp,
    alive: fighter.hp > 0,
  }))
}

function formatTeam(team: TeamFighter[]) {
  return team.map((fighter) => `${fighter.position + 1}号位 ${fighter.card.name}`).join("、")
}
