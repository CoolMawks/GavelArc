export function formatDistanceToNow(ts: number): string {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
export function formatUSDC(wei: bigint, decimals = 4): string {
  const n = Number(wei) / 1e18;
  if (n === 0) return "0";
  if (n < 0.0001) return n.toFixed(18).replace(/0+$/, "");
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
