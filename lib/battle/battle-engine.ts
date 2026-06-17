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

type Fighter = {
  side: "player" | "enemy"
  card: Card
  hp: number
  maxHp: number
  cooldown: number
  statuses: FighterStatus
  skipped: boolean
}

export type BattleOutcome = {
  result: "win" | "loss" | "draw"
  winnerCardId?: string
  loserCardId?: string
  log: string[]
  finalHp: {
    player: number
    enemy: number
  }
}

export function runBattle(playerCard: Card, enemyCard: Card): BattleOutcome {
  const player = makeFighter("player", playerCard)
  const enemy = makeFighter("enemy", enemyCard)
  const log: string[] = []

  applyBattleStartPassive(player, log)
  applyBattleStartPassive(enemy, log)
  processBattleStart(player, enemy, log)
  processBattleStart(enemy, player, log)

  for (let round = 1; round <= 10; round += 1) {
    log.push(`第 ${round} 回合开始。`)
    processTurnStart(player, enemy, log)
    processTurnStart(enemy, player, log)

    if (isDefeated(player) || isDefeated(enemy)) break

    const order = getActionOrder(player, enemy)
    for (const actor of order) {
      const target = actor.side === "player" ? enemy : player
      if (isDefeated(actor) || isDefeated(target)) continue
      act(actor, target, log)
      if (isDefeated(target)) {
        log.push(`${actor.card.name} 击败了 ${target.card.name}。`)
        break
      }
    }

    player.statuses = tickStatuses(player.statuses)
    enemy.statuses = tickStatuses(enemy.statuses)
    player.cooldown = Math.max(0, player.cooldown - 1)
    enemy.cooldown = Math.max(0, enemy.cooldown - 1)

    if (isDefeated(player) || isDefeated(enemy)) break
  }

  const result = resolveResult(player, enemy)
  if (result === "draw") {
    log.push("十回合后双方仍未倒下，战斗以平局结束。")
    return { result, log, finalHp: { player: Math.max(0, player.hp), enemy: Math.max(0, enemy.hp) } }
  }

  const winner = result === "win" ? player : enemy
  const loser = result === "win" ? enemy : player
  log.push(`战斗结束：${winner.card.name} 获胜。`)

  return {
    result,
    winnerCardId: winner.card.id,
    loserCardId: loser.card.id,
    log,
    finalHp: { player: Math.max(0, player.hp), enemy: Math.max(0, enemy.hp) },
  }
}

function makeFighter(side: Fighter["side"], card: Card): Fighter {
  return {
    side,
    card,
    hp: card.hp,
    maxHp: card.hp,
    cooldown: 0,
    statuses: [],
    skipped: false,
  }
}

function processTurnStart(fighter: Fighter, target: Fighter, log: string[]) {
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

  if (fighter.card.trigger === "turn_start" && shouldTrigger(fighter, target, "turn_start")) {
    executeSkill(fighter, target, log)
  }
}

function act(actor: Fighter, target: Fighter, log: string[]) {
  const stun = getStatus(actor.statuses, "stun")
  if (stun && !actor.skipped) {
    actor.skipped = true
    actor.statuses = removeStatus(actor.statuses, "stun")
    log.push(`${actor.card.name} 被震慑，跳过了这次行动。`)
    return
  }

  actor.skipped = false

  if (actor.card.trigger !== "turn_start" && actor.cooldown === 0 && shouldTrigger(actor, target, actor.card.trigger)) {
    executeSkill(actor, target, log)
    actor.cooldown = getEffectiveCooldown(actor.card)
    return
  }

  const damage = applyDamage(target, calculateDamage(actor.card, target.card), log, actor)
  log.push(`${actor.card.name} 普通攻击 ${target.card.name}，造成 ${damage} 点伤害。`)
}

function shouldTrigger(actor: Fighter, target: Fighter, trigger: string): boolean {
  if (trigger === "battle_start") return false
  if (trigger === "on_attack") return checkCondition(actor, target)
  if (trigger === "turn_start") return checkCondition(actor, target)
  if (trigger === "low_hp") return actor.hp / actor.maxHp <= 0.5 && checkCondition(actor, target)
  if (trigger === "on_hit") return actor.hp / actor.maxHp <= 0.7 && checkCondition(actor, target)
  return false
}

function processBattleStart(fighter: Fighter, target: Fighter, log: string[]) {
  if (fighter.card.trigger !== "battle_start") return

  log.push(`${fighter.card.name} 抢先发动开局技能。`)
  executeSkill(fighter, target, log)
}

function applyBattleStartPassive(fighter: Fighter, log: string[]) {
  if (!isPassiveEnabled(fighter.card)) return

  if (fighter.card.passiveComponent === "battle_instinct") {
    fighter.statuses = addStatus(fighter.statuses, { name: "focus", turns: 2, power: 1 })
    log.push(`${fighter.card.name} 的被动【战斗本能】发动，进入蓄势。`)
  } else if (fighter.card.passiveComponent === "quick_feet") {
    fighter.statuses = addStatus(fighter.statuses, { name: "speed_up", turns: 2, power: 2 })
    log.push(`${fighter.card.name} 的被动【轻足步法】发动，速度提升。`)
  }
}

function applyTurnStartPassive(fighter: Fighter, log: string[]) {
  if (!isPassiveEnabled(fighter.card) || fighter.hp <= 0 || fighter.hp / fighter.maxHp > 0.5) return

  if (fighter.card.passiveComponent === "emergency_barrier") {
    fighter.statuses = addStatus(fighter.statuses, { name: "shield", turns: 1, power: 4 })
    log.push(`${fighter.card.name} 的被动【临界屏障】发动，获得护盾。`)
  } else if (fighter.card.passiveComponent === "self_repair") {
    fighter.statuses = addStatus(fighter.statuses, { name: "regen", turns: 2, power: 1 })
    log.push(`${fighter.card.name} 的被动【自我修复】发动，获得再生。`)
  }
}

function checkCondition(actor: Fighter, target: Fighter): boolean {
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

function executeSkill(actor: Fighter, target: Fighter, log: string[]) {
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
  target: Fighter,
  amount: number,
  log: string[],
  attacker?: Fighter,
  options: { bypassShield?: boolean } = {},
): number {
  const mark = getStatus(target.statuses, "mark")
  const focus = attacker ? getStatus(attacker.statuses, "focus") : undefined
  const finalAmount = amount + (mark ? mark.power : 0) + (focus ? focus.power * 2 : 0)

  if (focus && attacker) {
    attacker.statuses = removeStatus(attacker.statuses, "focus")
    log.push(`${attacker.card.name} 的蓄势爆发，伤害提升。`)
  }

  const shield = getStatus(target.statuses, "shield")
  if (shield && !options.bypassShield) {
    const absorbed = Math.min(shield.power, finalAmount)
    shield.power -= absorbed
    const remaining = finalAmount - absorbed
    target.hp -= remaining
    log.push(`${target.card.name} 的护盾吸收了 ${absorbed} 点伤害。`)
    triggerCounter(target, attacker, log)
    return remaining
  }

  target.hp -= finalAmount
  triggerCounter(target, attacker, log)
  return finalAmount
}

function triggerCounter(target: Fighter, attacker: Fighter | undefined, log: string[]) {
  const counter = getStatus(target.statuses, "counter")
  if (!counter || !attacker || target.hp <= 0 || attacker.hp <= 0) return

  const damage = Math.min(attacker.hp, 1 + counter.power + Math.floor(target.card.def / 3))
  attacker.hp -= damage
  counter.power -= 1
  log.push(`${target.card.name} 反击 ${attacker.card.name}，造成 ${damage} 点伤害。`)
}

function getActionOrder(player: Fighter, enemy: Fighter): Fighter[] {
  return currentSpeed(player) >= currentSpeed(enemy) ? [player, enemy] : [enemy, player]
}

function currentSpeed(fighter: Fighter): number {
  return fighter.card.spd + (getStatus(fighter.statuses, "speed_up")?.power ?? 0)
}

function isDefeated(fighter: Fighter): boolean {
  return fighter.hp <= 0
}

function resolveResult(player: Fighter, enemy: Fighter): BattleOutcome["result"] {
  if (player.hp <= 0 && enemy.hp <= 0) return "draw"
  if (enemy.hp <= 0) return "win"
  if (player.hp <= 0) return "loss"

  const playerRatio = player.hp / player.maxHp
  const enemyRatio = enemy.hp / enemy.maxHp
  if (Math.abs(playerRatio - enemyRatio) < 0.05) return "draw"
  return playerRatio > enemyRatio ? "win" : "loss"
}
