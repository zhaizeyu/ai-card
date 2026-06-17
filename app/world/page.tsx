import { WorldDashboard } from "@/components/world/WorldDashboard"
import { prisma } from "@/lib/db"
import { getOrCreateWorld, teamRoles } from "@/lib/world/world-game"

export const dynamic = "force-dynamic"

export default async function WorldPage() {
  const world = await getOrCreateWorld()
  const [worldCards, cards, events, inventory] = await Promise.all([
    prisma.worldCard.findMany({
      where: { worldId: world.id, role: { in: [...teamRoles] } },
      include: { card: true },
    }),
    prisma.card.findMany({ orderBy: [{ level: "desc" }, { createdAt: "desc" }], take: 80 }),
    prisma.worldEvent.findMany({ where: { worldId: world.id }, orderBy: [{ day: "desc" }, { createdAt: "desc" }], take: 8 }),
    prisma.componentReward.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ])

  const pendingEvent = events.find((event) => event.status === "pending") ?? null

  return (
    <WorldDashboard
      world={{
        id: world.id,
        name: world.name,
        theme: world.theme,
        description: world.description,
        day: world.day,
        prosperity: world.prosperity,
        safety: world.safety,
        resource: world.resource,
        chaos: world.chaos,
        fame: world.fame,
      }}
      cards={cards.map(toCardSummary)}
      team={worldCards.map((item) => ({
        role: item.role as "team_1" | "team_2" | "team_3",
        bond: item.bond,
        card: toCardSummary(item.card),
      }))}
      pendingEvent={pendingEvent ? toEventState(pendingEvent) : null}
      recentEvents={events.map(toEventState)}
      inventory={inventory.map((item) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        description: item.description,
        effect: item.effect,
        cost: item.cost,
        equippedCardId: item.equippedCardId,
      }))}
    />
  )
}

function toCardSummary(card: {
  id: string
  name: string
  element: string
  rarity: string
  level: number
  exp: number
  hp: number
  atk: number
  def: number
  spd: number
  powerScore: number
  upgradeUnlocked: boolean
  upgradeComponent: string | null
  wins: number
  losses: number
}) {
  return {
    id: card.id,
    name: card.name,
    element: card.element,
    rarity: card.rarity,
    level: card.level,
    exp: card.exp,
    hp: card.hp,
    atk: card.atk,
    def: card.def,
    spd: card.spd,
    powerScore: card.powerScore,
    upgradeUnlocked: card.upgradeUnlocked,
    upgradeComponent: card.upgradeComponent,
    wins: card.wins,
    losses: card.losses,
  }
}

function toEventState(event: {
  id: string
  day: number
  type: string
  title: string
  description: string
  difficulty: number
  status: string
  result: string | null
}) {
  return {
    id: event.id,
    day: event.day,
    type: event.type,
    title: event.title,
    description: event.description,
    difficulty: event.difficulty,
    status: event.status,
    result: event.result,
  }
}
