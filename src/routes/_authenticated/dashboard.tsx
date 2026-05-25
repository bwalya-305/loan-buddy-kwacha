import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, TrendingUp, AlertTriangle, Users, Plus, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calcRepay, formatKwacha, loanStatus, statusLabel } from "@/lib/loan-utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MoWa Loans" }] }),
  component: Dashboard,
});

type LoanRow = {
  id: string;
  amount_kwacha: number;
  borrowed_date: string;
  repay_date: string;
  paid: boolean;
  paid_at: string | null;
  client: { full_name: string; phone: string } | null;
};

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [loansRes, clientsRes] = await Promise.all([
        supabase
          .from("loans")
          .select("id, amount_kwacha, borrowed_date, repay_date, paid, paid_at, client:clients(full_name, phone)")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
      ]);
      if (loansRes.error) throw loansRes.error;
      if (clientsRes.error) throw clientsRes.error;
      return {
        loans: (loansRes.data ?? []) as unknown as LoanRow[],
        clientCount: clientsRes.count ?? 0,
      };
    },
  });

  const loans = data?.loans ?? [];
  const active = loans.filter((l) => !l.paid);
  const totalLent = active.reduce((s, l) => s + Number(l.amount_kwacha), 0);
  const totalExpected = active.reduce((s, l) => s + calcRepay(Number(l.amount_kwacha)), 0);
  const overdueCount = active.filter((l) => loanStatus(l) === "overdue").length;

  const kpis = [
    {
      label: "Active loans",
      value: active.length.toString(),
      icon: Banknote,
      tint: "bg-primary/10 text-primary",
    },
    {
      label: "Total lent out",
      value: formatKwacha(totalLent),
      icon: TrendingUp,
      tint: "bg-accent/10 text-accent",
    },
    {
      label: "Expected back (40%)",
      value: formatKwacha(totalExpected),
      icon: Banknote,
      tint: "bg-gold/20 text-foreground",
    },
    {
      label: "Overdue",
      value: overdueCount.toString(),
      icon: AlertTriangle,
      tint: overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
    },
  ];

  const recent = loans.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            A quick view of your lending business today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/clients">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" /> Clients
            </Button>
          </Link>
          <Link to="/loans/new">
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" /> New loan
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60">
            <CardContent className="p-5">
              <div className={`h-10 w-10 rounded-lg grid place-items-center ${k.tint} mb-4`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-display font-semibold">
                {isLoading ? "—" : k.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Recent loans</CardTitle>
          <Link to="/loans" className="text-sm text-accent hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : recent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y">
              {recent.map((l) => {
                const status = loanStatus(l);
                return (
                  <div key={l.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{l.client?.full_name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        Borrowed {format(new Date(l.borrowed_date), "d MMM yyyy")} • Due{" "}
                        {format(new Date(l.repay_date), "d MMM yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{formatKwacha(Number(l.amount_kwacha))}</div>
                        <div className="text-xs text-muted-foreground">
                          Repay {formatKwacha(calcRepay(Number(l.amount_kwacha)))}
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        You have <span className="font-medium text-foreground">{data?.clientCount ?? 0}</span>{" "}
        registered client{(data?.clientCount ?? 0) === 1 ? "" : "s"}.
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display text-lg">No loans yet</h3>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Add your first client, then record a loan to get started.
      </p>
      <div className="flex gap-2 justify-center">
        <Link to="/clients">
          <Button variant="outline">Add client</Button>
        </Link>
        <Link to="/loans/new">
          <Button>New loan</Button>
        </Link>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: ReturnType<typeof loanStatus> }) {
  const map = {
    paid: "bg-success/15 text-success border-success/30",
    overdue: "bg-destructive/15 text-destructive border-destructive/30",
    "due-soon": "bg-warning/20 text-warning-foreground border-warning/40",
    active: "bg-accent/10 text-accent border-accent/30",
  } as const;
  return (
    <Badge variant="outline" className={`${map[status]} capitalize`}>
      {statusLabel[status]}
    </Badge>
  );
}
