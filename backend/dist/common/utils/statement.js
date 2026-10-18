"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatement = buildStatement;
const client_1 = require("@prisma/client");
const RANK = {
    SALE: 0,
    PURCHASE: 0,
    RETURN: 1,
    PAYMENT: 2,
};
function buildStatement(openingBalance, moves, from, to) {
    const sorted = [...moves].sort((a, b) => a.date.getTime() - b.date.getTime() ||
        RANK[a.type] - RANK[b.type] ||
        a.ref - b.ref);
    let balance = openingBalance;
    let opening = openingBalance;
    let debit = new client_1.Prisma.Decimal(0);
    let credit = new client_1.Prisma.Decimal(0);
    const rows = [];
    for (const m of sorted) {
        if (to !== undefined && m.date >= to)
            break;
        balance = balance.add(m.debit).sub(m.credit);
        if (from !== undefined && m.date < from) {
            opening = balance;
            continue;
        }
        rows.push({ ...m, balance });
        debit = debit.add(m.debit);
        credit = credit.add(m.credit);
    }
    return {
        opening,
        rows,
        totals: { debit, credit },
        closing: rows.length > 0 ? rows[rows.length - 1].balance : opening,
    };
}
