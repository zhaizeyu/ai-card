import { Boxes, LockKeyhole, Sparkles } from "lucide-react"
import { activeComponents, passiveComponents, upgradeComponents, type ComponentDefinition } from "@/lib/card/components"

const sections = [
  {
    title: "主动技能组件",
    description: "生成时即拥有，由触发、条件、目标和效果组成，是战斗的基础行为。",
    icon: Sparkles,
    components: activeComponents,
  },
  {
    title: "被动组件",
    description: "Lv.5 解锁，在开局或低生命状态下自动触发，强调卡牌个性和生存节奏。",
    icon: LockKeyhole,
    components: passiveComponents,
  },
  {
    title: "强化组件",
    description: "Lv.7 解锁，用来改造主动技能，让冷却、状态、伤害或生存技能产生轻量成长。",
    icon: Boxes,
    components: upgradeComponents,
  },
]

export default function ComponentsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-ink/50">组件展览</p>
        <h1 className="mt-2 text-4xl font-black">可组合组件库</h1>
        <p className="mt-4 leading-7 text-ink/70">
          当前 MVP 已完成主动技能、被动组件和强化组件三类。主动组件决定卡牌基础战斗方式，被动与强化组件会随等级解锁并参与自动战斗结算。
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <section key={section.title}>
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink/65">{section.description}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.components.map((component) => (
                  <ComponentCard key={component.id} component={component} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

function ComponentCard({ component }: { component: ComponentDefinition }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{component.name}</h3>
          <p className="mt-1 text-xs font-semibold text-ink/45">Lv.{component.unlockLevel} 解锁</p>
        </div>
        <span className="rounded bg-ink/[0.06] px-2 py-1 text-xs font-semibold text-ink/60">{component.slot}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/70">{component.summary}</p>
      <p className="mt-3 rounded-md bg-ink/[0.03] p-3 text-sm leading-6 text-ink/65">{component.ruleText}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {component.tags.map((tag) => (
          <span key={tag} className="rounded bg-tide/10 px-2 py-1 text-xs font-semibold text-ink/55">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
