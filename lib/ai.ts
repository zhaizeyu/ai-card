import { z } from "zod"
import type { Element } from "./card/element"
import { elementLabels } from "./card/element"
import type { Rarity } from "./card/rarity"
import { rarityLabels } from "./card/rarity"
import {
  conditionOptions,
  effectOptions,
  selectorOptions,
  triggerOptions,
  type SkillProposal,
  type SkillRule,
} from "./card/skill-generator"

const aiCardSchema = z.object({
  name: z.string().min(1).max(24),
  race: z.string().min(1).max(20),
  skillName: z.string().min(1).max(24),
  skillText: z.string().min(1).max(90),
  description: z.string().min(1).max(180),
  skillEffect: z.enum(effectOptions).optional(),
  skillTrigger: z.enum(triggerOptions).optional(),
  skillCondition: z.enum(conditionOptions).optional(),
  skillSelector: z.enum(selectorOptions).optional(),
})

export type AiCardCopy = z.infer<typeof aiCardSchema>
export type AiCardConcept = Omit<AiCardCopy, "skillEffect" | "skillTrigger" | "skillCondition" | "skillSelector">

const overpowerWords = ["灭世", "创世", "无限", "秒杀", "无敌", "终焉", "毁灭宇宙", "不可阻挡"]

export async function generateCardCopy(input: {
  prompt: string
  rarity: Rarity
  element: Element
  skill: SkillRule
  forceFallback?: boolean
}): Promise<{ copy: AiCardConcept; skillProposal: SkillProposal; rawOutput: string; source: "ai" | "fallback" }> {
  if (input.forceFallback || !process.env.OPENAI_API_KEY) {
    const copy = fallbackCardCopy(input)
    return { copy, skillProposal: {}, rawOutput: JSON.stringify(copy), source: "fallback" }
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  const downgraded = input.rarity === "common" ? "普通卡必须弱化过强设定，使用幼年、封印、残影、后裔、冒牌货、力量未觉醒等包装。" : ""

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你为怪物卡生成表现层 JSON 和一个可结算的技能意图。不要输出真实数值、倍率、概率、胜率、稀有度或冷却。技能意图必须从给定枚举中选择，避免总是选择灼烧；优先创造符合怪物设定的独特战斗方式。只返回 name, race, skillName, skillText, description, skillEffect, skillTrigger, skillCondition, skillSelector。",
        },
        {
          role: "user",
          content: JSON.stringify({
            userPrompt: input.prompt,
            balanceContext: {
              rarity: input.rarity,
              rarityLabel: rarityLabels[input.rarity],
              element: input.element,
              elementLabel: elementLabels[input.element],
              fallbackSkill: input.skill,
              allowedSkillEffects: effectOptions,
              allowedTriggers: triggerOptions,
              allowedConditions: conditionOptions,
              allowedSelectors: selectorOptions,
            },
            styleRule: downgraded,
          }),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`)
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const rawOutput = data.choices?.[0]?.message?.content ?? ""
  const parsed = aiCardSchema.safeParse(JSON.parse(rawOutput))

  if (!parsed.success) {
    throw new Error("AI output did not match card copy schema")
  }

  const copy = sanitizeCopy(parsed.data, input)
  const skillProposal = {
    effect: parsed.data.skillEffect,
    trigger: parsed.data.skillTrigger,
    condition: parsed.data.skillCondition,
    selector: parsed.data.skillSelector,
  }

  return { copy, skillProposal, rawOutput, source: "ai" }
}

function fallbackCardCopy(input: {
  prompt: string
  rarity: Rarity
  element: Element
  skill: SkillRule
}): AiCardConcept {
  const element = elementLabels[input.element]
  const intense = overpowerWords.some((word) => input.prompt.includes(word))
  const prefix = input.rarity === "common" && intense ? "封印" : rarityLabels[input.rarity]
  const race = inferRace(input.prompt)
  const effectName = effectCopy[input.skill.effect] ?? "灵光"

  return sanitizeCopy(
    {
      name: `${prefix}${element}${race}`,
      race,
      skillName: `${effectName}${input.rarity === "common" ? "雏形" : ""}`,
      skillText: `${race}释放带有${element}属性的${effectName}，效果由卡牌规则结算。`,
      description:
        input.rarity === "common" && intense
          ? `它被传说误认为灾厄本体，如今只是力量尚未觉醒的${race}后裔。`
          : `由一句描述召来的${element}属性${race}，保留着独特的气质与战斗本能。`,
    },
    input,
  )
}

function sanitizeCopy(copy: AiCardCopy, input: { rarity: Rarity; prompt: string }): AiCardConcept {
  const sanitized = {
    name: copy.name,
    race: copy.race,
    skillName: copy.skillName,
    skillText: copy.skillText,
    description: copy.description,
  }

  if (input.rarity !== "common") return sanitized
  const replacer = (text: string) =>
    overpowerWords.reduce((value, word) => value.replaceAll(word, "未觉醒"), text)

  return {
    name: replacer(sanitized.name),
    race: sanitized.race,
    skillName: replacer(sanitized.skillName),
    skillText: replacer(sanitized.skillText),
    description: replacer(sanitized.description),
  }
}

function inferRace(prompt: string): string {
  if (prompt.includes("龙")) return "幼龙"
  if (prompt.includes("猫")) return "猫妖"
  if (prompt.includes("菇") || prompt.includes("蘑菇")) return "菇怪"
  if (prompt.includes("机器人") || prompt.includes("机甲")) return "机偶"
  if (prompt.includes("狼")) return "狼灵"
  return "怪物"
}

const effectCopy: Record<string, string> = {
  damage: "猛击",
  burn: "余火",
  armor_break: "破甲",
  shield: "护壳",
  heal: "回春",
  speed_up: "迅捷",
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
