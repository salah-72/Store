import { Prisma } from '@prisma/client';

export type MoveType = 'SALE' | 'PURCHASE' | 'PAYMENT' | 'RETURN';

export type Move = {
  date: Date;
  type: MoveType;
  ref: number;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  note?: string | null;
};

export type StatementRow = Move & { balance: Prisma.Decimal };

const RANK: Record<MoveType, number> = {
  SALE: 0,
  PURCHASE: 0,
  RETURN: 1,
  PAYMENT: 2,
};

export function buildStatement(
  openingBalance: Prisma.Decimal,
  moves: Move[],
  from?: Date,
  to?: Date,
) {
  const sorted = [...moves].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      RANK[a.type] - RANK[b.type] ||
      a.ref - b.ref,
  );

  let balance = openingBalance;
  let opening = openingBalance;
  let debit = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);
  const rows: StatementRow[] = [];

  for (const m of sorted) {
    if (to !== undefined && m.date >= to) break;

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
