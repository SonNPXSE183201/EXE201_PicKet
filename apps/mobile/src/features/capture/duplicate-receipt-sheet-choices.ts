export type DuplicateChoice = "view" | "save" | "cancel";

/** Saving anyway is offered only when the photo itself differs (same shop, day and total). */
export function duplicateChoices(exact: boolean): DuplicateChoice[] {
  return exact ? ["view", "cancel"] : ["view", "save", "cancel"];
}
