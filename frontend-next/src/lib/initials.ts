/**
 * Derives up to 2 uppercase initials from a display name.
 * Handles empty strings, single words, and names with extra spaces.
 */
export function getInitials(name: string): string {
  return (
    (name ?? "")
      .split(" ")
      .map((n) => n[0] ?? "")
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}
