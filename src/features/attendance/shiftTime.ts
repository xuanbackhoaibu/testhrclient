/**
 * Adds minutes to an HH:mm clock time, wrapping past midnight.
 *
 * Used to show the moment a shift starts counting a punch as late, so the rule
 * is legible on screen instead of only living in the backend classifier.
 * Returns the input unchanged when it is not a valid HH:mm value.
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return time;

  const total = ((hours * 60 + mins + minutes) % 1440 + 1440) % 1440;
  const outHours = Math.floor(total / 60);
  const outMinutes = total % 60;

  return `${String(outHours).padStart(2, '0')}:${String(outMinutes).padStart(2, '0')}`;
}
