export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hourPart = `${hours} hr${hours === 1 ? "" : "s"}`;
  return remainder > 0 ? `${hourPart} ${remainder} min` : hourPart;
}
