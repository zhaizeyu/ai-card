import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.card.findUnique({ where: { id } })

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 })
  }

  return NextResponse.json({ card })
}
