import { BattlePairPicker } from "@/components/battle/BattlePairPicker"
import { prisma } from "@/lib/db"

export default async function GalleryPage() {
  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" }, take: 50 })

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-black">公开卡牌图鉴</h1>
      <p className="mt-3 text-ink/70">这里展示最近生成的怪物卡。可以保留单卡 1v1 模拟，也可以手动选择敌我双方各 3 张进行 3v3 小队模拟。</p>
      <BattlePairPicker cards={cards} />
    </main>
  )
}
