export type SliceRoom = { id: number; batchId: number; room: number }; // room = still returnable from this slice

export function allocateToSlices(slices: SliceRoom[], qty: number) {
  const parts: { sliceId: number; batchId: number; baseQty: number }[] = [];
  let left = qty;
  for (const s of slices) {
    if (left <= 0) break;
    if (s.room <= 0) continue;
    const take = Math.min(left, s.room);
    parts.push({ sliceId: s.id, batchId: s.batchId, baseQty: take });
    left -= take;
  }
  return { parts, missing: left };
}
