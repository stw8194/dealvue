/** Discount window is half-open: start is included, end is excluded. */
export function startsInVisitWindow(slot: string, start: string, end: string) {
  const local = new Date(Date.parse(slot) + 9 * 3_600_000);
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
  return minute >= minutes(start) && minute < minutes(end);
}
