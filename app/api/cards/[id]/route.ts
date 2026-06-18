import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.card.findUnique({ where: { id } })

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }

  return NextResponse.json({ card })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const card = await prisma.card.findUnique({ where: { id }, select: { id: true } })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.worldCard.deleteMany({ where: { cardId: id } }),
      prisma.componentReward.updateMany({
        where: { equippedCardId: id },
        data: { equippedCardId: null, equippedSlot: null },
      }),
      prisma.battle.deleteMany({
        where: {
          OR: [{ playerCardId: id }, { enemyCardId: id }],
        },
      }),
      prisma.card.delete({ where: { id } }),
    ])

    revalidatePath("/")
    revalidatePath("/gallery")
    revalidatePath("/world")
    revalidatePath(`/cards/${id}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除卡牌失败" },
      { status: 400 },
    )
  }
}
