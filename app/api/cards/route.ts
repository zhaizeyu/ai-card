import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cardListQuerySchema } from "@/lib/validators"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = cardListQuerySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    rarity: url.searchParams.get("rarity") ?? undefined,
    element: url.searchParams.get("element") ?? undefined,
  })

  const cards = await prisma.card.findMany({
    where: {
      rarity: query.rarity,
      element: query.element,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
  })

  return NextResponse.json({ cards })
}
