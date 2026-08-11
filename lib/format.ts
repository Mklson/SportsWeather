export function formatCount(n: number): string {
  if (n >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return n.toLocaleString("en-US");
}
