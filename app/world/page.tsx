import { Panel } from "@/components/ui/card"

export default function WorldPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-black">小世界</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink/70">
        数据模型已经预留 World、WorldCard 和 WorldEvent。MVP 当前先完成卡牌生成与战斗结算，小世界会复用战斗系统作为事件解决器。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["世界属性", "繁荣、安全、资源、混乱、声望"],
          ["卡牌角色", "守卫、探索、建设、法师、商人、领袖"],
          ["事件结算", "入侵、探索、建设、危机、社交、发现"],
        ].map(([title, text]) => (
          <Panel key={title} className="p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">{text}</p>
          </Panel>
        ))}
      </div>
    </main>
  )
}
