/**
 * Returns a time-based greeting using the browser's local timezone.
 * Must only be called client-side (after mount).
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Extracts the first name from a full name string. */
export function getFirstName(fullName: string): string {
  return (fullName ?? "").split(" ")[0] || fullName;
}
