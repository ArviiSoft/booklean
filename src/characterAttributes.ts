import catalog from "../electron/character-attributes.json" with { type: "json" };
import type { CharacterAttributes } from "./types";

export const attributeGroups = catalog.groups;
export const attributeDefinitions = attributeGroups.flatMap(
  (group) => group.traits,
);

export function validAttribute(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

export function characterProfile(attributes: CharacterAttributes = {}) {
  const ranked = attributeDefinitions
    .filter(({ id }) => validAttribute(attributes[id]))
    .map((trait) => ({ ...trait, value: attributes[trait.id]! }))
    .sort((a, b) => b.value - a.value);
  const highest = ranked[0]?.value ?? 0;
  const dominant =
    highest > 0 ? ranked.filter((trait) => trait.value === highest) : [];
  const axes = catalog.axes.flatMap(({ left, right }) => {
    const leftValue = attributes[left],
      rightValue = attributes[right];
    if (
      !validAttribute(leftValue) ||
      !validAttribute(rightValue) ||
      leftValue + rightValue === 0
    )
      return [];
    return [
      {
        id: left + "-" + right,
        left: attributeDefinitions.find((trait) => trait.id === left)!.label,
        right: attributeDefinitions.find((trait) => trait.id === right)!.label,
        leftValue,
        rightValue,
        position: (100 * rightValue) / (leftValue + rightValue),
      },
    ];
  });
  return { ranked, dominant, axes };
}