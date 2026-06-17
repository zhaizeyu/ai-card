import { NextResponse } from "next/server"
import { createMonsterCard } from "@/lib/card/card-generator"
import { promptSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt } = promptSchema.parse(body)
    const card = await createMonsterCard(prompt)

    return NextResponse.json({ cardId: card.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成卡牌失败" },
      { status: 400 },
    )
  }
}
