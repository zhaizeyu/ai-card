import { useEffect } from "react"
import { WorldDashboard } from "@/components/world/WorldDashboard"
import { useGameStore } from "@/src/store/game-store"

export default function WorldPage() {
  const data = useGameStore((state) => state.worldData)
  const loadWorld = useGameStore((state) => state.loadWorld)
  const error = useGameStore((state) => state.error)

  useEffect(() => {
    void loadWorld()
  }, [loadWorld])

  if (!data) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink/60">{error ?? "加载中..."}</main>
  }

  return <WorldDashboard {...data} />
}
