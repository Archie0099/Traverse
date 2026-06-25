export const fmtInt = (n: number): string => Math.round(n).toLocaleString("en-US");

export function fmtTime(ms: number): string {
  if (ms < 0.01) return "0.01 ms";
  if (ms < 10) return ms.toFixed(2) + " ms";
  if (ms < 100) return ms.toFixed(1) + " ms";
  return Math.round(ms).toLocaleString("en-US") + " ms";
}
