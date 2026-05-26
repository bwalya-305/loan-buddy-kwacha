import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    confirmed: search.confirmed === "1" || search.confirmed === 1 || search.confirmed === true,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — MoWa Loans" },
      { name: "description", content: "Sign in to manage your loan clients securely." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const { confirmed } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmedBanner, setConfirmedBanner] = useState(false);

  useEffect(() => {
    if (confirmed) {
      setConfirmedBanner(true);
      setMode("signin");
      // Clean the param from the URL so refreshes don't keep showing the banner.
      navigate({ to: "/login", search: {}, replace: true });
    }
  }, [confirmed, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <aside className="md:w-1/2 bg-primary text-primary-foreground p-8 md:p-14 flex flex-col justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gold text-gold-foreground grid place-items-center">
            <Banknote className="h-5 w-5" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">MoWa Loans</span>
        </Link>

        <div className="hidden md:block max-w-md">
          <h1 className="font-display text-4xl leading-tight mb-4">
            Track every loan. <span className="text-gold">Get paid on time.</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            A simple, private tool for your lending business. Manage clients, record loans in
            Kwacha, and instantly see what's owed back.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} MoWa Loans
        </p>
      </aside>

      {/* Right form */}
      <main className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <h2 className="font-display text-3xl mb-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Sign in to access your loan records."
              : "Set up your private MoWa Loans workspace."}
          </p>

          {confirmedBanner && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-md border border-success/30 bg-success/10 text-success-foreground p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div className="text-sm text-foreground">
                <div className="font-medium">Email confirmed</div>
                <div className="text-muted-foreground">Please sign in to continue.</div>
              </div>
            </div>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value={mode}>
              <form onSubmit={submit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-12"
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full h-12 text-base">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
