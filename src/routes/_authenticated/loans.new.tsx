import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcInterest, calcRepay, formatKwacha } from "@/lib/loan-utils";

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

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        client_id,
        amount,
        borrowed_date,
        repay_date,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("loans").insert({
        user_id: u.user.id,
        client_id: parsed.data.client_id,
        amount_kwacha: parsed.data.amount,
        borrowed_date: parsed.data.borrowed_date,
        repay_date: parsed.data.repay_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["client", client_id] });
      toast.success("Loan recorded");
      navigate({ to: "/loans" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/loans" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
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
                <Label htmlFor="repay">Expected repay date</Label>
                <Input
                  id="repay"
                  type="date"
                  value={repay_date}
                  onChange={(e) => setRepay(e.target.value)}
                  min={borrowed_date}
                  className="h-12"
                  required
                />
              </div>
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
