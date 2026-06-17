import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createMonsterCard } from "@/lib/card/card-generator"
import { prisma } from "@/lib/db"
import { runBattle } from "@/lib/battle/battle-engine"
import { buildBattleReward } from "@/lib/battle/rewards"
import { runTeamBattle } from "@/lib/battle/team-battle-engine"
import { applyCardProgression } from "@/lib/card/card-progression"
import { pickPassiveComponent, pickUpgradeComponent } from "@/lib/card/components"
import { battleRequestSchema } from "@/lib/validators"

const enemyPrompts = ["铁甲菇怪", "潮汐小妖", "风铃狼灵", "碎岩泥偶", "暗影灯蛾", "火花猫妖"]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cardId, opponentCardId, cardIds, opponentCardIds } = battleRequestSchema.parse(body)

    if (cardIds?.length) {
      const playerCards = await prisma.card.findMany({ where: { id: { in: cardIds } } })
      const orderedPlayerCards = cardIds
        .map((id) => playerCards.find((card) => card.id === id))
        .filter((card): card is (typeof playerCards)[number] => Boolean(card))

      if (orderedPlayerCards.length !== cardIds.length) {
        return NextResponse.json({ error: "Team card not found" }, { status: 404 })
      }

      const enemyCards = opponentCardIds?.length
        ? await prisma.card.findMany({ where: { id: { in: opponentCardIds } } })
        : await Promise.all(
            orderedPlayerCards.map(() =>
              createMonsterCard(enemyPrompts[Math.floor(Math.random() * enemyPrompts.length)], { useAi: false }),
            ),
          )
      const orderedEnemyCards = opponentCardIds?.length
        ? opponentCardIds
            .map((id) => enemyCards.find((card) => card.id === id))
            .filter((card): card is (typeof enemyCards)[number] => Boolean(card))
        : enemyCards

      if (!orderedEnemyCards.length || (opponentCardIds?.length && orderedEnemyCards.length !== opponentCardIds.length)) {
        return NextResponse.json({ error: "Opponent team card not found" }, { status: 404 })
      }

      const isSimulation = Boolean(opponentCardIds?.length)
      const outcome = runTeamBattle(orderedPlayerCards, orderedEnemyCards)
      const reward = isSimulation
        ? { exp: 0, component: null, team: [] }
        : {
            exp: outcome.result === "win" ? 8 : outcome.result === "draw" ? 4 : 3,
            component: buildBattleReward(outcome.result === "win" ? orderedPlayerCards[0] : orderedEnemyCards[0], outcome.result).component,
            team: [] as Array<{
              cardId: string
              exp: number
              levelsGained: number
              level: number
              unlocked: string[]
              title?: string | null
            }>,
          }

      if (!isSimulation) {
        for (const card of orderedPlayerCards) {
          const progression = applyCardProgression(card, outcome.result, reward.exp)
          reward.team.push({
            cardId: card.id,
            exp: reward.exp,
            levelsGained: progression.levelsGained,
            level: progression.level,
            unlocked: progression.unlocked,
            title: progression.title,
          })
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
              passiveComponent: card.passiveComponent ?? pickPassiveComponent(card),
              upgradeComponent: card.upgradeComponent ?? pickUpgradeComponent(card),
              wins: outcome.result === "win" ? { increment: 1 } : undefined,
              losses: outcome.result === "loss" ? { increment: 1 } : undefined,
            },
          })
        }
      }

      const battle = await prisma.battle.create({
        data: {
          playerCardId: orderedPlayerCards[0].id,
          enemyCardId: orderedEnemyCards[0].id,
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

      if (reward.component && outcome.result === "win" && !isSimulation) {
        await prisma.componentReward.create({ data: reward.component })
      }
      revalidatePath("/")
      revalidatePath("/gallery")
      revalidatePath("/world")
      revalidatePath(`/battles/${battle.id}`)
      orderedPlayerCards.forEach((card) => {
        revalidatePath(`/cards/${card.id}`)
        revalidatePath(`/battle/${card.id}`)
      })

      return NextResponse.json({
        battleId: battle.id,
        result: outcome.result,
        log: outcome.log,
        reward,
      })
    }

    const playerCard = await prisma.card.findUnique({ where: { id: cardId } })

    if (!playerCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const enemyCard = opponentCardId
      ? await prisma.card.findUnique({ where: { id: opponentCardId } })
      : await createMonsterCard(enemyPrompts[Math.floor(Math.random() * enemyPrompts.length)], { useAi: false })

    if (!enemyCard) {
      return NextResponse.json({ error: "Opponent card not found" }, { status: 404 })
    }

    const isSimulation = Boolean(opponentCardId)
    const outcome = runBattle(playerCard, enemyCard)
    const playerResult = outcome.result
    const reward = isSimulation
      ? { exp: 0, component: null }
      : buildBattleReward(playerResult === "win" ? playerCard : enemyCard, playerResult)
    const progression = !isSimulation ? applyCardProgression(playerCard, playerResult) : null
    const rewardPayload = progression
      ? {
          ...reward,
          levelsGained: progression.levelsGained,
          level: progression.level,
          unlocked: progression.unlocked,
          title: progression.title,
        }
      : reward

    const battle = await prisma.battle.create({
      data: {
        playerCardId: playerCard.id,
        enemyCardId: enemyCard.id,
        result: playerResult,
        winnerCardId: outcome.winnerCardId,
        loserCardId: outcome.loserCardId,
        battleLog: JSON.stringify(outcome.log),
        rewardJson: JSON.stringify(rewardPayload),
      },
    })

    if (progression) {
      await prisma.card.update({
        where: { id: playerCard.id },
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
          passiveComponent: playerCard.passiveComponent ?? pickPassiveComponent(playerCard),
          upgradeComponent: playerCard.upgradeComponent ?? pickUpgradeComponent(playerCard),
          wins: playerResult === "win" ? { increment: 1 } : undefined,
          losses: playerResult === "loss" ? { increment: 1 } : undefined,
        },
      })
    }

    if (reward.component && playerResult === "win" && !isSimulation) {
      await prisma.componentReward.create({ data: reward.component })
    }
    revalidatePath("/")
    revalidatePath("/gallery")
    revalidatePath("/world")
    revalidatePath(`/cards/${playerCard.id}`)
    revalidatePath(`/battle/${playerCard.id}`)
    revalidatePath(`/battles/${battle.id}`)

    return NextResponse.json({
      battleId: battle.id,
      result: playerResult,
      log: outcome.log,
      reward: rewardPayload,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "战斗失败" },
      { status: 400 },
    )
  }
}
