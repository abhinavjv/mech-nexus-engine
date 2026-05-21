import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Store,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Package,
  Sparkles,
  X,
  Database,
  Receipt,
} from "lucide-react";
import {
  createProduct,
  listProducts,
  provisionStore,
  type Product,
} from "@/lib/api";

export const Route = createFileRoute("/")({ component: Index });

type Session = { email: string };

const SESSION_KEY = "atelier.session";
const STORE_KEY = "atelier.activeStore";

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}
function loadStore(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORE_KEY);
}

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setActiveStore(loadStore());
    setHydrated(true);
  }, []);

  function handleAuth(email: string) {
    const s = { email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }
  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STORE_KEY);
    setSession(null);
    setActiveStore(null);
  }
  function handleStoreCreated(name: string) {
    const fq = name.startsWith("Store-") ? name : `Store-${name.trim().replace(/\s+/g, "-")}`;
    localStorage.setItem(STORE_KEY, fq);
    setActiveStore(fq);
  }

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!session) return <AuthView onAuth={handleAuth} />;
  if (!activeStore) return <ProvisionView email={session.email} onCreated={handleStoreCreated} onLogout={handleLogout} />;
  return (
    <Dashboard
      session={session}
      activeStore={activeStore}
      onLogout={handleLogout}
      onSwitchStore={() => {
        localStorage.removeItem(STORE_KEY);
        setActiveStore(null);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* SHARED CHROME                                                       */
/* ------------------------------------------------------------------ */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background:
          "radial-gradient(1100px 600px at 10% -10%, oklch(0.95 0.04 258 / 0.6) 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, oklch(0.94 0.04 200 / 0.5) 0%, transparent 50%), var(--background)",
      }}
    >
      {children}
    </div>
  );
}

function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Store className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className={`font-serif leading-none ${text}`}>Atelier</div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">
          Commerce Studio
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. AUTH                                                             */
/* ------------------------------------------------------------------ */

function AuthView({ onAuth }: { onAuth: (email: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.includes("@") || password.length < 6) {
      setErr("Enter a valid email and a password of 6+ characters.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      onAuth(email);
      setBusy(false);
    }, 500);
  }

  return (
    <PageShell>
      <div className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Brand size="lg" />
          </div>

          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm p-8">
            <h1 className="font-serif text-3xl">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to manage your storefronts."
                : "Set up an account to provision your first store."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </Field>

              {err && (
                <div className="flex gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
                  </>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to Atelier?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErr(null);
                }}
                className="text-primary hover:underline font-medium"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* 2. PROVISIONING                                                     */
/* ------------------------------------------------------------------ */

function ProvisionView({
  email,
  onCreated,
  onLogout,
}: {
  email: string;
  onCreated: (name: string) => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function provision() {
    if (!name.trim()) return;
    setErr(null);
    setSuccess(false);
    setBusy(true);
    setSteps([
      { label: "Spinning up Products Table", done: false },
      { label: "Spinning up Orders Table", done: false },
      { label: "Wiring API Gateway routes", done: false },
    ]);
    try {
      // Simulate progressive steps while real call runs.
      const tick = (i: number) =>
        setTimeout(
          () =>
            setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, done: true } : step))),
          400 * (i + 1),
        );
      tick(0);
      tick(1);
      await provisionStore(name.trim());
      tick(2);
      setTimeout(() => {
        setSuccess(true);
        setTimeout(() => onCreated(name.trim()), 700);
      }, 1400);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/60">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <Brand size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{email}</span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Step 1 of 1
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl mt-3">Create your first store</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Pick a name. We'll provision an isolated database and an API namespace for it.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm p-8">
          <Field label="Store name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alpha Tech"
              disabled={busy}
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-muted-foreground mt-2">
            Will be provisioned as{" "}
            <span className="font-mono text-foreground">
              Store-{name.trim().replace(/\s+/g, "-") || "Your-Store"}
            </span>
          </p>

          <button
            onClick={provision}
            disabled={busy || !name.trim()}
            className="mt-6 w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Provisioning…
              </>
            ) : (
              <>
                <Database className="h-4 w-4" /> Provision Store Infrastructure
              </>
            )}
          </button>

          {steps.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {success && (
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 flex gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
              <span>Store provisioned successfully. Redirecting…</span>
            </div>
          )}
          {err && (
            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" /> {err}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* 3. DASHBOARD                                                        */
/* ------------------------------------------------------------------ */

function Dashboard({
  session,
  activeStore,
  onLogout,
  onSwitchStore,
}: {
  session: Session;
  activeStore: string;
  onLogout: () => void;
  onSwitchStore: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const items = await listProducts(activeStore);
      setProducts(items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + Number(p.price || 0), 0),
    [products],
  );
  const categories = useMemo(
    () => new Set(products.map((p) => p.category).filter(Boolean)).size,
    [products],
  );

  return (
    <PageShell>
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Brand size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:block">{session.email}</span>
            <button
              onClick={onSwitchStore}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
            >
              New store
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Active Storefront
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl mt-1.5">{activeStore}</h1>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard icon={Package} label="Products" value={String(products.length)} />
          <StatCard icon={Receipt} label="Catalog value" value={`$${totalValue.toFixed(2)}`} />
          <StatCard icon={Database} label="Categories" value={String(categories)} />
        </section>

        {/* Inventory */}
        <section className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-serif text-2xl">Product Inventory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live from <span className="font-mono">{activeStore}</span>
              </p>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </header>

          {err && (
            <div className="px-6 py-4 border-b border-border bg-destructive/5 text-sm text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {err}
            </div>
          )}

          {loading && products.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
              Loading inventory…
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No products yet.</p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Add your first one →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="px-6 py-3 font-medium">Product ID</th>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.productId}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/40 transition"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {p.productId}
                      </td>
                      <td className="px-6 py-3 font-medium">{p.name}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                          {p.category || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        ${Number(p.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {addOpen && (
        <AddProductModal
          activeStore={activeStore}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
    </PageShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-serif text-3xl mt-2">{value}</div>
    </div>
  );
}

function AddProductModal({
  activeStore,
  onClose,
  onCreated,
}: {
  activeStore: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ productId: "", name: "", price: "", category: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  const valid =
    form.productId.trim() && form.name.trim() && form.price.trim() && form.category.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setErr(null);
    try {
      await createProduct(activeStore, {
        productId: form.productId.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim(),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-2xl">Add new product</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{activeStore}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Product ID">
            <input
              value={form.productId}
              onChange={(e) => update("productId", e.target.value)}
              placeholder="SKU-001"
              className={inputCls}
            />
          </Field>
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Wireless Earbuds"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="49.99"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="Audio"
                className={inputCls}
              />
            </Field>
          </div>

          {err && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5" /> {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !valid}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              "Add to Catalog"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SMALL UTILITIES                                                     */
/* ------------------------------------------------------------------ */

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
