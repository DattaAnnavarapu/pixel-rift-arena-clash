/** Session-scoped, client-only switch for optional event polish. No network calls. */
export const SAFE_MODE_KEY = "rift-event-safe-mode";

/** Pure decision for unit tests and non-browser callers. */
export function allowPolish(
  query: string,
  savedSafeMode: boolean,
  effectsOn: boolean,
): boolean {
  return !savedSafeMode && new URLSearchParams(query).get("safe") !== "1" && effectsOn;
}

/**
 * ?safe=1 persists until the browser session ends. ?safe=0 has no override:
 * once disabled, optional polish remains disabled for this tab session.
 */
export function polishEnabled(effectsOn: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("safe") === "1") {
      window.sessionStorage.setItem(SAFE_MODE_KEY, "1");
    }
    return (
      window.sessionStorage.getItem(SAFE_MODE_KEY) !== "1" && effectsOn
    );
  } catch {
    // If session storage is inaccessible, a ?safe=1 link still works.
    return (
      new URLSearchParams(window.location.search).get("safe") !== "1" &&
      effectsOn
    );
  }
}
