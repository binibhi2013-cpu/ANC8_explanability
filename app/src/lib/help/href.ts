/**
 * Links into the Help, kept apart from the help text itself so that every screen can
 * link to its explanation without loading all of it.
 */

/** "map.ranked" -> "/help/map#ranked"; "map" -> "/help/map". */
export function helpHref(id: string): string {
  const [topic, card] = id.split(".");
  return card ? `/help/${topic}#${card}` : `/help/${topic}`;
}

export function termHref(id: string): string {
  return `/help/terms#term-${id}`;
}

/** The help topic for a screen: its nav key, except the screener, which shares a path. */
export function topicForScreen(navKey: string | undefined, pathname: string, mode: string | null): string | null {
  if (pathname.startsWith("/help")) return null;
  return navKey ?? null;
}
