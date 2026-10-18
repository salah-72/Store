"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSaleDate = resolveSaleDate;
exports.priceLine = priceLine;
exports.saleTotals = saleTotals;
exports.planFefo = planFefo;
exports.sumSlices = sumSlices;
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const date_1 = require("../../common/utils/date.js");
const client_1 = require("@prisma/client");
function resolveSaleDate(day, today, now = new Date()) {
    if (!day || day === today)
        return now;
    return new Date((0, date_1.cairoStartOfDay)(day).getTime() + 12 * 60 * 60 * 1000);
}
function priceLine(item, l) {
    if (l.lineTotal !== undefined) {
        const lineTotal = new client_1.Prisma.Decimal(l.lineTotal).toDecimalPlaces(2);
        return {
            lineTotal,
            unitPrice: lineTotal.div(l.baseQty).toDecimalPlaces(6),
        };
    }
    const price = l.price !== undefined ? new client_1.Prisma.Decimal(l.price) : item.price;
    return {
        lineTotal: new client_1.Prisma.Decimal(l.baseQty)
            .mul(price)
            .div(item.priceBasis)
            .toDecimalPlaces(2),
        unitPrice: price.div(item.priceBasis).toDecimalPlaces(6),
    };
}
function saleTotals(subtotal, discount, paid, hasCustomer) {
    if (discount.gt(subtotal)) {
        throw new appError_1.default(`Discount (${discount.toString()}) cannot exceed the invoice subtotal (${subtotal.toString()})`, 404);
    }
    const total = subtotal.sub(discount);
    if (!hasCustomer && !paid.eq(total)) {
        throw new appError_1.default('A sale without a customer must be paid in full: choose a customer for a credit sale', 404);
    }
    return { total };
}
function planFefo(batches, need) {
    const slices = [];
    let left = need;
    for (const b of batches) {
        if (left <= 0)
            break;
        if (b.qtyRemaining <= 0)
            continue;
        const take = Math.min(left, b.qtyRemaining);
        slices.push({ batchId: b.id, baseQty: take, unitCost: b.unitCost });
        left -= take;
    }
    return { slices, missing: left };
}
function sumSlices(slices) {
    const m = new Map();
    for (const s of slices)
        m.set(s.batchId, (m.get(s.batchId) ?? 0) + s.baseQty);
    return m;
}
