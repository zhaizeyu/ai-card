import type { Card } from "@prisma/client"

const effectLabels: Record<string, string> = {
  damage: "直伤",
  burn: "灼烧",
  armor_break: "破甲",
  shield: "护盾",
  heal: "治疗",
  speed_up: "加速",
  lifesteal: "汲取",
  stun: "震慑",
  chain: "连击",
  pierce: "贯穿",
  execute: "收割",
  poison: "毒蚀",
  regen: "再生",
  counter: "反击",
  focus: "蓄势",
  mark: "标记",
  cleanse: "净化",
}

const triggerLabels: Record<string, string> = {
  battle_start: "开局",
  on_attack: "攻击时",
  on_hit: "受击后",
  turn_start: "回合开始",
  low_hp: "低生命",
  on_kill: "击败时",
}

const conditionLabels: Record<string, string> = {
  none: "无",
  enemy_burning: "敌方灼烧",
  enemy_statused: "敌方有状态",
  enemy_low_hp: "敌方低生命",
  self_low_hp: "自身低生命",
  enemy_high_def: "敌方高防",
  self_faster: "速度领先",
}

export function SkillBox({ card }: { card: Card }) {
  return (
    <div className="rounded-md border border-ink/10 bg-ink/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{card.skillName}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/70">{card.skillText}</p>
        </div>
        <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-semibold text-ink/70">
          {effectLabels[card.effect] ?? card.effect}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/60 md:grid-cols-4">
        <span>触发 {triggerLabels[card.trigger] ?? card.trigger}</span>
        <span>条件 {conditionLabels[card.condition] ?? card.condition}</span>
        <span>目标 {card.selector}</span>
        <span>强度 {card.effectPower}</span>
      </div>
    </div>
  )
}
