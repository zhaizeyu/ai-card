import { prisma } from "@/lib/db"
import { generateCardCopy } from "@/lib/ai"
import { promptSchema } from "@/lib/validators"
import { generateStats } from "./card-balance"
import { rollElement } from "./element"
import { rollRarity } from "./rarity"
import { generateSkill } from "./skill-generator"

export async function createMonsterCard(prompt: string) {
  const { prompt: safePrompt } = promptSchema.parse({ prompt })
  const rarity = rollRarity()
  const element = rollElement()
  const stats = generateStats(rarity)
  const skill = generateSkill(rarity, safePrompt)

  try {
    const { copy, rawOutput, source } = await generateCardCopy({
      prompt: safePrompt,
      rarity,
      element,
      skill,
    })

    const card = await prisma.card.create({
      data: {
        prompt: safePrompt,
        name: copy.name,
        race: copy.race,
        element,
        rarity,
        ...stats,
        skillName: copy.skillName,
        skillText: copy.skillText,
        skillType: skill.skillType,
        trigger: skill.trigger,
        condition: skill.condition,
        selector: skill.selector,
        effect: skill.effect,
        effectPower: skill.effectPower,
        cooldown: skill.cooldown,
        description: copy.description,
      },
    })

    await prisma.generationLog.create({
      data: {
        prompt: safePrompt,
        rawOutput,
        status: source === "ai" ? "success" : "fallback",
      },
    })

    return card
  } catch (error) {
    await prisma.generationLog.create({
      data: {
        prompt: safePrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown AI error",
      },
    })
    throw error
  }
}
