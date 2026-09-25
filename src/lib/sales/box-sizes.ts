import type { BoxSize, SalesOrder, SalesSettings } from "./types";

export function getBoxSizeById(
  settings: SalesSettings,
  id: string,
): BoxSize | undefined {
  const trimmed = id.trim();
  if (!trimmed) return undefined;
  return (settings.boxSizes ?? []).find((box) => box.id === trimmed);
}

export function resolveBoxRate(
  settings: SalesSettings,
  boxSizeId: string,
): number {
  const box = getBoxSizeById(settings, boxSizeId);
  return box ? Math.max(0, box.rate) : 0;
}

export function formatBoxSizeOption(box: BoxSize): string {
  return `${box.name} — Rs. ${box.rate}`;
}

export function getOrderBoxSizeLabel(
  order: SalesOrder,
  settings: SalesSettings,
): string {
  const id = order.boxSizeId?.trim();
  if (!id) return "—";

  const box = getBoxSizeById(settings, id);
  if (box) return box.name;

  if (order.boxRate !== undefined && order.boxRate > 0) {
    return `Unknown box (Rs. ${order.boxRate})`;
  }

  return "Unknown box";
}

export function adjustPackingForBoxChange(
  currentPacking: number,
  previousBoxRate: number | undefined,
  newBoxRate: number,
): number {
  const prev = Math.max(0, Number(previousBoxRate) || 0);
  const next = Math.max(0, newBoxRate);
  return Math.max(0, currentPacking - prev + next);
}
