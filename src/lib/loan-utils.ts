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
