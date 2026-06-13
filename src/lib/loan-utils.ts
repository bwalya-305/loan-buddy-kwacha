export const INTEREST_RATE = 0.4;

export function calcRepay(amount: number): number {
  return Math.round(amount * (1 + INTEREST_RATE) * 100) / 100;
}

export function calcInterest(amount: number): number {
  return Math.round(amount * INTEREST_RATE * 100) / 100;
}

const kwacha = new Intl.NumberFormat("en-ZM", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKwacha(amount: number): string {
  return `K ${kwacha.format(amount)}`;
}

export type LoanStatus = "paid" | "overdue" | "due-soon" | "active";

export function loanStatus(loan: { paid: boolean; repay_date: string }): LoanStatus {
  if (loan.paid) return "paid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const repay = new Date(loan.repay_date);
  repay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((repay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due-soon";
  return "active";
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export const statusLabel: Record<LoanStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  "due-soon": "Due soon",
  active: "Active",
};

export type InstallmentFrequency = "weekly" | "biweekly" | "monthly";

export type InstallmentRow = {
  sequence: number;
  due_date: string; // yyyy-MM-dd
  amount_kwacha: number;
};

function addInterval(date: Date, frequency: InstallmentFrequency, steps: number): Date {
  const d = new Date(date);
  if (frequency === "weekly") d.setDate(d.getDate() + 7 * steps);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14 * steps);
  else d.setMonth(d.getMonth() + steps);
  return d;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function generateSchedule(
  total: number,
  count: number,
  firstDate: string,
  frequency: InstallmentFrequency,
): InstallmentRow[] {
  if (count < 1) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  const start = new Date(firstDate);
  const rows: InstallmentRow[] = [];
  for (let i = 0; i < count; i++) {
    const portion = i === count - 1 ? base + remainder : base;
    rows.push({
      sequence: i + 1,
      due_date: fmtDate(addInterval(start, frequency, i)),
      amount_kwacha: portion / 100,
    });
  }
  return rows;
}
