export const emotes = {
  gg: "GG",
  hello: "HELLO",
  nice: "NICE!",
  thanks: "THANKS",
} as const;
export type EmoteId = keyof typeof emotes;
export function isEmote(value: unknown): value is EmoteId {
  return typeof value === "string" && Object.hasOwn(emotes, value);
}
export const teamMarkers = ["■", "▲"] as const;
