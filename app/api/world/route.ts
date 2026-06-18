import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import {
  advanceWorldDay,
  assignTeamCard,
  equipComponent,
  getOrCreateWorld,
  exploreWorldLocation,
  resolveWorldEvent,
  trainTeamBond,
  travelWorldLocation,
} from "@/lib/world/world-game"
import { worldActionSchema } from "@/lib/validators"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = worldActionSchema.parse(body)

    if (payload.action === "create") {
      const world = await getOrCreateWorld()
      revalidatePath("/world")
      return NextResponse.json({ worldId: world.id })
    }

    if (payload.action === "assign_team") {
      await assignTeamCard(payload.worldId, payload.role, payload.cardId)
      revalidatePath("/world")
      return NextResponse.json({ ok: true })
    }

    if (payload.action === "advance_day") {
      await advanceWorldDay(payload.worldId)
      revalidatePath("/world")
      return NextResponse.json({ ok: true })
    }

    if (payload.action === "travel_location") {
      await travelWorldLocation(payload.worldId, payload.locationId)
      revalidatePath("/world")
      return NextResponse.json({ ok: true })
    }

    if (payload.action === "explore_location") {
      await exploreWorldLocation(payload.worldId, payload.locationId)
      revalidatePath("/world")
      return NextResponse.json({ ok: true })
    }

    if (payload.action === "train_bond") {
      await trainTeamBond(payload.worldId)
      revalidatePath("/world")
      return NextResponse.json({ ok: true })
    }

    if (payload.action === "resolve_event") {
      const result = await resolveWorldEvent(payload.eventId, payload.approach)
      revalidatePath("/")
      revalidatePath("/gallery")
      revalidatePath("/world")
      if ("battleId" in result) revalidatePath(`/battles/${result.battleId}`)
      return NextResponse.json(result)
    }

    if (payload.action === "equip_component") {
      await equipComponent(payload.componentId, payload.cardId)
      revalidatePath("/gallery")
      revalidatePath("/world")
      revalidatePath(`/cards/${payload.cardId}`)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "小世界操作失败" },
      { status: 400 },
    )
  }
}
