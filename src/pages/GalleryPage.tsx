import { useEffect } from "react"
import { BattlePairPicker } from "@/components/battle/BattlePairPicker"
import { useGameStore } from "@/src/store/game-store"

export default function GalleryPage() {
  const cards = useGameStore((state) => state.galleryCards)
  const loadGalleryCards = useGameStore((state) => state.loadGalleryCards)
  const error = useGameStore((state) => state.error)

  useEffect(() => {
    void loadGalleryCards()
  }, [loadGalleryCards])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">公开卡牌图鉴</h1>
      <p className="mt-3 text-ink/70">这里展示最近生成的怪物卡。可以保留单卡 1v1 模拟，也可以手动选择敌我双方各 3 张进行 3v3 小队模拟。</p>
      {error ? <p className="mt-4 text-sm font-semibold text-ember">{error}</p> : null}
      <BattlePairPicker cards={cards} />
    </main>
  )
}
