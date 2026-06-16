export type Element = "fire" | "water" | "wind" | "earth" | "light" | "dark"

export const elements: Element[] = ["fire", "water", "wind", "earth", "light", "dark"]

export const elementLabels: Record<Element, string> = {
  fire: "火",
  water: "水",
  wind: "风",
  earth: "土",
  light: "光",
  dark: "暗",
}

export function rollElement(random = Math.random): Element {
  return elements[Math.floor(random() * elements.length)]
}

export function getElementMultiplier(attacker: Element, defender: Element): number {
  if (
    (attacker === "fire" && defender === "wind") ||
    (attacker === "wind" && defender === "earth") ||
    (attacker === "earth" && defender === "water") ||
    (attacker === "water" && defender === "fire") ||
    (attacker === "light" && defender === "dark") ||
    (attacker === "dark" && defender === "light")
  ) {
    return 1.25
  }

  if (
    (defender === "fire" && attacker === "wind") ||
    (defender === "wind" && attacker === "earth") ||
    (defender === "earth" && attacker === "water") ||
    (defender === "water" && attacker === "fire")
  ) {
    return 0.85
  }

  return 1
}
