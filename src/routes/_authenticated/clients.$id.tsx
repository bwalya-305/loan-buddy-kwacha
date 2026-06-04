import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, IdCard, Plus, CheckCircle2, Banknote } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { calcRepay, formatKwacha, loanStatus } from "@/lib/loan-utils";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Client — MoWa Loans" }] }),
  component: ClientDetail,
});

type Loan = {
  id: string;
  amount_kwacha: number;
  borrowed_date: string;
  repay_date: string;
  paid: boolean;
  paid_at: string | null;
};

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [clientRes, loansRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("loans")
          .select("id, amount_kwacha, borrowed_date, repay_date, paid, paid_at")
          .eq("client_id", id)
          .order("borrowed_date", { ascending: false }),
      ]);
      if (clientRes.error) throw clientRes.error;
      if (loansRes.error) throw loansRes.error;
      return { client: clientRes.data, loans: (loansRes.data ?? []) as Loan[] };
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
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success(variables.paid ? "Loan marked as paid" : "Payment status reverted");
    },
    onError: (e: any) => toast.error(import.meta.env.DEV ? e.message : "Failed to update loan. Please try again."),
  });

  if (isLoading) return <div className="text-muted-foreground py-12 text-center">Loading…</div>;
  if (!data?.client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found.</p>
        <Link to="/clients" className="text-accent underline mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  const { client, loans } = data;
  const active = loans.filter((l) => !l.paid);
  const totalOutstanding = active.reduce((s, l) => s + calcRepay(Number(l.amount_kwacha)), 0);

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-semibold">
            {client.full_name
              .split(" ")
              .map((p: string) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl">{client.full_name}</h1>
            <div className="text-muted-foreground text-sm flex flex-wrap gap-4 mt-1">
              <span className="inline-flex items-center gap-1">
                <IdCard className="h-3.5 w-3.5" /> NRC {client.nrc_number}
              </span>
              <a
                href={`tel:${client.phone}`}
                className="inline-flex items-center gap-1 hover:text-accent"
              >
                <Phone className="h-3.5 w-3.5" /> {client.phone}
              </a>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate({ to: "/loans/new", search: { client: id } as any })}>
          <Plus className="h-4 w-4 mr-2" /> New loan for this client
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total loans" value={loans.length.toString()} />
        <KpiCard label="Active loans" value={active.length.toString()} />
        <KpiCard label="Expected back" value={formatKwacha(totalOutstanding)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Loan history</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="py-10 text-center">
              <Banknote className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No loans recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {loans.map((l) => {
                const status = loanStatus(l);
                const repay = calcRepay(Number(l.amount_kwacha));
                return (
                  <div
                    key={l.id}
                    className="py-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium">{formatKwacha(Number(l.amount_kwacha))}</div>
                      <div className="text-xs text-muted-foreground">
                        Borrowed {format(new Date(l.borrowed_date), "d MMM yyyy")} • Due{" "}
                        {format(new Date(l.repay_date), "d MMM yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm">Repay {formatKwacha(repay)}</div>
                        <div className="text-xs text-muted-foreground">+40% interest</div>
                      </div>
                      <StatusBadge status={status} />
                      {!l.paid ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark paid
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark loan as paid?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Confirm that {client.full_name} has paid back{" "}
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
                          Undo paid
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "bg-primary text-primary-foreground border-primary" : ""}>
      <CardContent className="p-5">
        <div className={`text-2xl font-display font-semibold`}>{value}</div>
        <div className={`text-sm mt-1 ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
