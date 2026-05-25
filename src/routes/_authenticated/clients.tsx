import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, User, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — MoWa Loans" }] }),
  component: ClientsPage,
});

type Client = {
  id: string;
  full_name: string;
  nrc_number: string;
  phone: string;
  created_at: string;
};

const clientSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(120),
  nrc_number: z
    .string()
    .trim()
    .min(6, "NRC seems too short")
    .max(20, "NRC seems too long")
    .regex(/^[0-9/\- ]+$/, "Use digits, /, - only"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone seems too short")
    .max(20)
    .regex(/^[0-9+\- ]+$/, "Use digits, +, - only"),
});

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Client deleted");
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = clients.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      c.full_name.toLowerCase().includes(s) ||
      c.nrc_number.toLowerCase().includes(s) ||
      c.phone.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Everyone you've lent to. {clients.length} total.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add client
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, NRC or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg">
              {clients.length === 0 ? "No clients yet" : "No matches"}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              {clients.length === 0
                ? "Add your first client to start tracking loans."
                : "Try a different search."}
            </p>
            {clients.length === 0 && (
              <Button onClick={() => setOpenForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:border-accent/40 transition-colors">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                    {c.full_name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      NRC {c.nrc_number} • {c.phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to="/clients/$id" params={{ id: c.id }}>
                    <Button variant="ghost" size="sm">
                      View <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(c);
                      setOpenForm(true);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(c)}
                    aria-label="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientForm
        open={openForm}
        onOpenChange={(o) => {
          setOpenForm(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name} will be removed along with all of their loans. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientForm({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Client | null;
}) {
  const qc = useQueryClient();
  const [full_name, setFullName] = useState("");
  const [nrc_number, setNrc] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open) {
      setFullName(editing?.full_name ?? "");
      setNrc(editing?.nrc_number ?? "");
      setPhone(editing?.phone ?? "");
    }
  }, [open, editing]);

  const reset = () => {
    setFullName("");
    setNrc("");
    setPhone("");
  };

  const mut = useMutation({
    mutationFn: async (payload: z.infer<typeof clientSchema>) => {
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        const { error } = await supabase
          .from("clients")
          .insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(editing ? "Client updated" : "Client added");
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = clientSchema.safeParse({ full_name, nrc_number, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    mut.mutate(parsed.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit client" : "Add a client"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update the client's contact details." : "Enter the borrower's contact details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fn">Full name</Label>
            <Input
              id="fn"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Mwansa Banda"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nrc">NRC number</Label>
            <Input
              id="nrc"
              value={nrc_number}
              onChange={(e) => setNrc(e.target.value)}
              placeholder="e.g. 123456/78/1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Phone number</Label>
            <Input
              id="ph"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +260 97 1234567"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
