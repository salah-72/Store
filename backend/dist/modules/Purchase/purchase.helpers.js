"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePurchaseDate = resolvePurchaseDate;
exports.prepareLines = prepareLines;
exports.invoiceTotals = invoiceTotals;
exports.sumByBatch = sumByBatch;
exports.returnCapViolations = returnCapViolations;
exports.batchDeltas = batchDeltas;
const date_1 = require("../../common/utils/date.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
function resolvePurchaseDate(day, today, now = new Date()) {
    if (!day || day === today)
        return now;
    if (day > today)
        throw new appError_1.default('Purchase date cannot be in the future', 400);
    return new Date((0, date_1.cairoStartOfDay)(day).getTime() + 12 * 60 * 60 * 1000);
}
const MAX_QTY = 2_000_000_000;
function prepareLines(lines, items, today) {
    return lines.map((l, index) => {
        const item = items.get(l.itemId);
        if (!item)
            throw new appError_1.default(`Line ${index + 1}: item ${l.itemId} not found`, 404);
        let baseQty;
        if (l.packs !== undefined) {
            if (!item.packSize) {
                throw new appError_1.default(`Line ${index + 1}: "${item.name}" has no pack size, send baseQty instead`, 400);
            }
            const q = new client_1.Prisma.Decimal(l.packs).mul(item.packSize);
            if (!q.isInteger()) {
                throw new appError_1.default(`Line ${index + 1}: ${l.packs} packs of "${item.name}" is not a whole number of units`, 400);
            }
            baseQty = q.toNumber();
        }
        else {
            baseQty = l.baseQty;
        }
        if (baseQty <= 0 || baseQty > MAX_QTY) {
            throw new appError_1.default(`Line ${index + 1}: quantity is out of range`, 400);
        }
        const lineTotal = new client_1.Prisma.Decimal(l.lineTotal);
        const unitCost = lineTotal.div(baseQty).toDecimalPlaces(6);
        let expiryDate = date_1.NO_EXPIRY;
        if (l.expiryDate !== null) {
            if (l.expiryDate <= today) {
                throw new appError_1.default(`Line ${index + 1}: "${item.name}" is already expired (${l.expiryDate})`, 400);
            }
            expiryDate = new Date(`${l.expiryDate}T00:00:00.000Z`);
        }
        return { itemId: l.itemId, baseQty, lineTotal, unitCost, expiryDate };
    });
}
function invoiceTotals(subtotal, discount) {
    if (discount.gt(subtotal)) {
        throw new appError_1.default(`Discount (${discount.toString()}) cannot exceed the invoice subtotal (${subtotal.toString()})`, 400);
    }
    const total = subtotal.sub(discount);
    return { total };
}
function sumByBatch(lines) {
    const m = new Map();
    for (const l of lines)
        m.set(l.batchId, (m.get(l.batchId) ?? 0) + l.baseQty);
    return m;
}
function returnCapViolations(returned, newQty) {
    return [...returned]
        .filter(([batchId, qty]) => (newQty.get(batchId) ?? 0) < qty)
        .map(([batchId]) => batchId);
}
function batchDeltas(oldQty, newQty) {
    const ids = new Set([...oldQty.keys(), ...newQty.keys()]);
    const deltas = [];
    for (const batchId of ids) {
        const delta = (newQty.get(batchId) ?? 0) - (oldQty.get(batchId) ?? 0);
        if (delta !== 0)
            deltas.push({ batchId, delta });
    }
    return deltas.sort((a, b) => a.delta - b.delta);
}
