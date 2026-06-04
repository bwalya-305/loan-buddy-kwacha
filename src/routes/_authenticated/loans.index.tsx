import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, CheckCircle2, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { calcRepay, formatKwacha, loanStatus, type LoanStatus } from "@/lib/loan-utils";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/loans/")({
  head: () => ({ meta: [{ title: "Loans — MoWa Loans" }] }),
  component: LoansPage,
});

type LoanRow = {
  id: string;
  amount_kwacha: number;
  borrowed_date: string;
  repay_date: string;
  paid: boolean;
  paid_at: string | null;
  client: { id: string; full_name: string; phone: string } | null;
};

type Filter = "all" | LoanStatus;

function LoansPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select(
          "id, amount_kwacha, borrowed_date, repay_date, paid, paid_at, client:clients(id, full_name, phone)"
        )
        .order("borrowed_date", { ascending: false });
      if (error) throw error;
      return data as unknown as LoanRow[];
    },
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("loans")
        .update({ paid, paid_at: paid ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(variables.paid ? "Loan marked as paid" : "Payment status reverted");
    },
    onError: (e: any) => toast.error(import.meta.env.DEV ? e.message : "Failed to update loan. Please try again."),
  });

  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Loan deleted successfully");
    },
    onError: (e: any) => toast.error(import.meta.env.DEV ? e.message : "Failed to delete loan. Please try again."),
  });

  const filtered = loans.filter((l) => {
    const s = q.trim().toLowerCase();
    if (s) {
      const match =
        l.client?.full_name.toLowerCase().includes(s) ||
        l.client?.phone.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (filter === "all") return true;
    return loanStatus(l) === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Loans</h1>
          <p className="text-muted-foreground mt-1">
            {loans.length} total · interest fixed at 40%
          </p>
        </div>
        <Link to="/loans/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New loan
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="due-soon">Due soon</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg">No loans to show</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {loans.length === 0
                ? "Record your first loan to get started."
                : "Try a different filter or search."}
            </p>
          </CardContent>
        </Card>

      ) : (
        <div className="grid gap-3">
          {filtered.map((l) => {
            const status = loanStatus(l);
            const repay = calcRepay(Number(l.amount_kwacha));
            return (
              <Card key={l.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    {l.client ? (
                      <Link
                        to="/clients/$id"
                        params={{ id: l.client.id }}
                        className="font-medium hover:text-accent"
                      >
                        {l.client.full_name}
                      </Link>
                    ) : (
                      <span className="font-medium">Unknown client</span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Borrowed {format(new Date(l.borrowed_date), "d MMM yyyy")} • Due{" "}
                      {format(new Date(l.repay_date), "d MMM yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">{formatKwacha(Number(l.amount_kwacha))}</div>
                      <div className="text-xs text-muted-foreground">
                        Repay {formatKwacha(repay)}
                      </div>
                    </div>
                    <StatusBadge status={status} />
                    {!l.paid ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Paid
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark loan as paid?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Confirm that {l.client?.full_name ?? "this client"} has paid back{" "}
                              {formatKwacha(repay)}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => togglePaid.mutate({ id: l.id, paid: true })}
                            >
                              Yes, mark paid
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePaid.mutate({ id: l.id, paid: false })}
                      >
                        Undo
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete loan"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the loan record permanently.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteLoan.mutate(l.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
