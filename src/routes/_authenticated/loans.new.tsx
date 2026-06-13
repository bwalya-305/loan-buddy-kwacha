import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calcInterest,
  calcRepay,
  formatKwacha,
  generateSchedule,
  type InstallmentFrequency,
} from "@/lib/loan-utils";

const searchSchema = z.object({
  client: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/loans/new")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "New loan — MoWa Loans" }] }),
  component: NewLoanPage,
});

const formSchema = z
  .object({
    client_id: z.string().uuid("Choose a client"),
    amount: z.number().positive("Amount must be greater than 0").max(10_000_000),
    borrowed_date: z.string().min(1, "Pick a date"),
    repay_date: z.string().min(1, "Pick a date"),
  })
  .refine((d) => new Date(d.repay_date) >= new Date(d.borrowed_date), {
    message: "Repay date must be on or after borrow date",
    path: ["repay_date"],
  });

function NewLoanPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const today = format(new Date(), "yyyy-MM-dd");
  const [client_id, setClientId] = useState(search.client ?? "");
  const [amountStr, setAmountStr] = useState("");
  const [borrowed_date, setBorrowed] = useState(today);
  const [repay_date, setRepay] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  // Installment state
  const [installmentsOn, setInstallmentsOn] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(4);
  const [frequency, setFrequency] = useState<InstallmentFrequency>("monthly");
  const [firstDate, setFirstDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const amount = Number(amountStr.replace(/[, ]/g, "")) || 0;
  const repay = useMemo(() => calcRepay(amount), [amount]);
  const interest = useMemo(() => calcInterest(amount), [amount]);

  const schedule = useMemo(
    () =>
      installmentsOn && installmentCount >= 2 && repay > 0
        ? generateSchedule(repay, installmentCount, firstDate, frequency)
        : [],
    [installmentsOn, installmentCount, repay, firstDate, frequency],
  );

  // Sync repay_date to final installment date when schedule is on
  useEffect(() => {
    if (installmentsOn && schedule.length > 0) {
      setRepay(schedule[schedule.length - 1].due_date);
    }
  }, [installmentsOn, schedule]);

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        client_id,
        amount,
        borrowed_date,
        repay_date,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (installmentsOn) {
        if (installmentCount < 2 || installmentCount > 24)
          throw new Error("Installments must be between 2 and 24");
        if (new Date(firstDate) < new Date(borrowed_date))
          throw new Error("First installment must be on or after the borrow date");
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: loan, error } = await supabase
        .from("loans")
        .insert({
          user_id: u.user.id,
          client_id: parsed.data.client_id,
          amount_kwacha: parsed.data.amount,
          borrowed_date: parsed.data.borrowed_date,
          repay_date: parsed.data.repay_date,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (installmentsOn && loan) {
        const rows = schedule.map((r) => ({
          loan_id: loan.id,
          user_id: u.user!.id,
          sequence: r.sequence,
          due_date: r.due_date,
          amount_kwacha: r.amount_kwacha,
        }));
        const { error: insErr } = await supabase.from("loan_installments").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["client", client_id] });
      toast.success("Loan created successfully");
      navigate({ to: "/loans" });
    },
    onError: (e: any) =>
      toast.error(import.meta.env.DEV ? e.message : "Failed to create loan. Please try again."),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        to="/loans"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to loans
      </Link>

      <div>
        <h1 className="font-display text-3xl md:text-4xl">Record a new loan</h1>
        <p className="text-muted-foreground mt-1">
          Interest is fixed at 40%. The repay amount updates as you type.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {clients.length === 0 && !clientsLoading ? (
                <div className="rounded-md border border-dashed p-4 text-sm">
                  <p className="text-muted-foreground mb-2">
                    You need to add a client first.
                  </p>
                  <Link to="/clients">
                    <Button type="button" size="sm">
                      Add a client
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={client_id} onValueChange={setClientId}>
                  <SelectTrigger id="client" className="h-12">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount borrowed (ZMW)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  K
                </span>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12 text-lg"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the cash amount given to the client.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrowed">Date borrowed</Label>
                <Input
                  id="borrowed"
                  type="date"
                  value={borrowed_date}
                  onChange={(e) => setBorrowed(e.target.value)}
                  max={today}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repay">
                  {installmentsOn ? "Final installment date" : "Expected repay date"}
                </Label>
                <Input
                  id="repay"
                  type="date"
                  value={repay_date}
                  onChange={(e) => setRepay(e.target.value)}
                  min={borrowed_date}
                  className="h-12"
                  disabled={installmentsOn}
                  required
                />
                {installmentsOn && (
                  <p className="text-xs text-muted-foreground">
                    Set automatically from your installment schedule.
                  </p>
                )}
              </div>
            </div>

            {/* Installments section */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="installments-toggle" className="text-base">
                    Pay in installments
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Split the repayment into a schedule the client pays over time.
                  </p>
                </div>
                <Switch
                  id="installments-toggle"
                  checked={installmentsOn}
                  onCheckedChange={setInstallmentsOn}
                />
              </div>

              {installmentsOn && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="count">Number of installments</Label>
                      <Input
                        id="count"
                        type="number"
                        min={2}
                        max={24}
                        value={installmentCount}
                        onChange={(e) =>
                          setInstallmentCount(Math.max(2, Math.min(24, Number(e.target.value) || 2)))
                        }
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freq">Frequency</Label>
                      <Select
                        value={frequency}
                        onValueChange={(v) => setFrequency(v as InstallmentFrequency)}
                      >
                        <SelectTrigger id="freq" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first">First installment date</Label>
                      <Input
                        id="first"
                        type="date"
                        value={firstDate}
                        onChange={(e) => setFirstDate(e.target.value)}
                        min={borrowed_date}
                        className="h-11"
                      />
                    </div>
                  </div>

                  {schedule.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 w-12">#</th>
                            <th className="text-left px-3 py-2">Due date</th>
                            <th className="text-right px-3 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {schedule.map((r) => (
                            <tr key={r.sequence}>
                              <td className="px-3 py-2 text-muted-foreground">{r.sequence}</td>
                              <td className="px-3 py-2">
                                {format(new Date(r.due_date), "EEE, MMM d, yyyy")}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatKwacha(r.amount_kwacha)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-primary text-primary-foreground p-5">
              <div className="text-xs uppercase tracking-wider text-primary-foreground/70">
                Expected repay amount
              </div>
              <div className="font-display text-3xl mt-1 text-gold">
                {formatKwacha(repay)}
              </div>
              <div className="text-sm text-primary-foreground/80 mt-2">
                Principal {formatKwacha(amount)} + 40% interest ({formatKwacha(interest)})
                {installmentsOn && schedule.length > 0 && (
                  <> · split into {schedule.length} installments</>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Link to="/loans">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={mut.isPending || clients.length === 0}>
                {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record loan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
