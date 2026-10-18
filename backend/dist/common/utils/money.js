"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proportionalValue = exports.netFactor = void 0;
exports.splitAmount = splitAmount;
exports.checkCashRefund = checkCashRefund;
const client_1 = require("@prisma/client");
const appError_1 = __importDefault(require("./appError"));
const D = (n) => new client_1.Prisma.Decimal(n);
const netFactor = (total, subtotal) => subtotal.isZero() ? D(1) : total.div(subtotal);
exports.netFactor = netFactor;
const proportionalValue = (lineTotal, lineQty, qty, factor = D(1)) => lineTotal.mul(qty).div(lineQty).mul(factor).toDecimalPlaces(2);
exports.proportionalValue = proportionalValue;
function splitAmount(total, weights) {
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (weights.length === 0 || sumW <= 0)
        throw new Error('splitAmount: weights must be positive');
    const cents = total.toDecimalPlaces(2).mul(100);
    const raw = weights.map((w) => cents.mul(w).div(sumW));
    const floors = raw.map((r) => r.toDecimalPlaces(0, client_1.Prisma.Decimal.ROUND_DOWN));
    const left = cents.sub(floors.reduce((a, f) => a.add(f), D(0))).toNumber(); // cents still to hand out
    const order = raw
        .map((r, i) => ({ i, frac: r.sub(floors[i]) }))
        .sort((a, b) => b.frac.cmp(a.frac) || a.i - b.i);
    for (let k = 0; k < left; k++) {
        const i = order[k % weights.length].i;
        floors[i] = floors[i].add(1);
    }
    return floors.map((f) => f.div(100));
}
function checkCashRefund(total, cash, mustRefundAll) {
    if (cash.lt(0) || cash.gt(total)) {
        throw new appError_1.default(`Cash refund must be between 0 and the return total (${total.toString()})`, 400);
    }
    if (mustRefundAll && !cash.eq(total)) {
        throw new appError_1.default('A return without a customer account must be refunded in cash in full', 400);
    }
}
