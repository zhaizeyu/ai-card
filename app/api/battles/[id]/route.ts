import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const battle = await prisma.battle.findUnique({
    where: { id },
    include: {
      playerCard: true,
      enemyCard: true,
    },
  })

  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 })
  }

  return NextResponse.json({
    battle: {
      ...battle,
      battleLog: JSON.parse(battle.battleLog) as string[],
      rewardJson: battle.rewardJson ? JSON.parse(battle.rewardJson) : null,
    },
  })
}
