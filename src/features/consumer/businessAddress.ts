/** Display the supplied district address without its import annotation. */
export function businessAddress(address: string | null | undefined) {
  return (address ?? "").replace(/\s*\(예시 지역\)/g, "").trim();
}
