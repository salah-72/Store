"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateToSlices = allocateToSlices;
function allocateToSlices(slices, qty) {
    const parts = [];
    let left = qty;
    for (const s of slices) {
        if (left <= 0)
            break;
        if (s.room <= 0)
            continue;
        const take = Math.min(left, s.room);
        parts.push({ sliceId: s.id, batchId: s.batchId, baseQty: take });
        left -= take;
    }
    return { parts, missing: left };
}
