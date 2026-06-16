import { NextResponse } from "next/server"
import { createMonsterCard } from "@/lib/card/card-generator"
import { prisma } from "@/lib/db"
import { runBattle } from "@/lib/battle/battle-engine"
import { buildBattleReward } from "@/lib/battle/rewards"
import { battleRequestSchema } from "@/lib/validators"

const enemyPrompts = ["铁甲菇怪", "潮汐小妖", "风铃狼灵", "碎岩泥偶", "暗影灯蛾", "火花猫妖"]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cardId, opponentCardId } = battleRequestSchema.parse(body)
    const playerCard = await prisma.card.findUnique({ where: { id: cardId } })

    if (!playerCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const enemyCard = opponentCardId
      ? await prisma.card.findUnique({ where: { id: opponentCardId } })
      : await createMonsterCard(enemyPrompts[Math.floor(Math.random() * enemyPrompts.length)])

    if (!enemyCard) {
      return NextResponse.json({ error: "Opponent card not found" }, { status: 404 })
    }

    const isSimulation = Boolean(opponentCardId)
    const outcome = runBattle(playerCard, enemyCard)
    const playerResult = outcome.result
    const reward = isSimulation
      ? { exp: 0, component: null }
      : buildBattleReward(playerResult === "win" ? playerCard : enemyCard, playerResult)

    const battle = await prisma.battle.create({
      data: {
        playerCardId: playerCard.id,
        enemyCardId: enemyCard.id,
        result: playerResult,
        winnerCardId: outcome.winnerCardId,
        loserCardId: outcome.loserCardId,
        battleLog: JSON.stringify(outcome.log),
        rewardJson: JSON.stringify(reward),
      },
    })

    if (!isSimulation) {
      await prisma.card.update({
        where: { id: playerCard.id },
        data: {
          exp: { increment: reward.exp },
          wins: playerResult === "win" ? { increment: 1 } : undefined,
          losses: playerResult === "loss" ? { increment: 1 } : undefined,
          level: playerCard.exp + reward.exp >= playerCard.level * 30 ? { increment: 1 } : undefined,
        },
      })
    }

    if (reward.component && playerResult === "win" && !isSimulation) {
      await prisma.componentReward.create({ data: reward.component })
    }

    return NextResponse.json({
      battleId: battle.id,
      result: playerResult,
      log: outcome.log,
      reward,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "战斗失败" },
      { status: 400 },
    )
  }
}
