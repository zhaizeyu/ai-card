import { GenerateCardForm } from "@/components/create/GenerateCardForm"
import { Panel } from "@/components/ui/card"

export default function CreatePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-black">生成怪物卡</h1>
        <p className="mt-3 max-w-2xl leading-7 text-ink/70">
          描述决定外观和故事，不直接决定强度。系统会先抽稀有度、分配属性，再让 AI 生成表现层文案。
        </p>
      </div>
      <Panel className="p-5">
        <GenerateCardForm />
      </Panel>
    </main>
  )
}
