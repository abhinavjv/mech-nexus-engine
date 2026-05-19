import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Boxes,
  Wrench,
  ShoppingCart,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Receipt,
  Settings,
  Store,
  X,
  Sparkles,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const BASE_URL = "https://o2dkvnfpyf.execute-api.ap-south-1.amazonaws.com/dev";

type Product = { productId: string; name: string; price: number; category: string };
type CartItem = Product & { qty: number };
type Tab = "storefront" | "inventory" | "settings";
type LogEntry = { time: string; level: "INFO" | "ERR" | "OK"; msg: string };

/* ---------- Background templates ---------- */
type BgTemplate = {
  id: string;
  label: string;
  kind: "solid" | "pattern";
  style: React.CSSProperties;
  swatch: React.CSSProperties;
};

const BG_TEMPLATES: BgTemplate[] = [
  { id: "paper", label: "Paper", kind: "solid",
    style: { background: "#fafbfc" },
    swatch: { background: "#fafbfc" } },
  { id: "mist", label: "Mist", kind: "solid",
    style: { background: "#e8ecf1" },
    swatch: { background: "#e8ecf1" } },
  { id: "sand", label: "Sand", kind: "solid",
    style: { background: "#f5efe6" },
    swatch: { background: "#f5efe6" } },
  { id: "ink", label: "Ink", kind: "solid",
    style: { background: "#1f2937", color: "#f8fafc" },
    swatch: { background: "#1f2937" } },
  { id: "dots", label: "Dots", kind: "pattern",
    style: {
      background:
        "radial-gradient(#cbd5e1 1px, transparent 1px) 0 0 / 18px 18px, #fafbfc",
    },
    swatch: { background: "radial-gradient(#94a3b8 1.5px, transparent 1.5px) 0 0 / 8px 8px, #fafbfc" } },
  { id: "grid", label: "Grid", kind: "pattern",
    style: {
      background:
        "linear-gradient(#e2e8f0 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, #e2e8f0 1px, transparent 1px) 0 0 / 24px 24px, #fafbfc",
    },
    swatch: { background: "linear-gradient(#cbd5e1 1px,transparent 1px) 0 0/10px 10px, linear-gradient(90deg,#cbd5e1 1px,transparent 1px) 0 0/10px 10px, #fafbfc" } },
  { id: "diag", label: "Diagonal", kind: "pattern",
    style: {
      background:
        "repeating-linear-gradient(45deg, #eef2f7 0 10px, #fafbfc 10px 20px)",
    },
    swatch: { background: "repeating-linear-gradient(45deg,#dbe2ec 0 4px,#fafbfc 4px 8px)" } },
  { id: "noise", label: "Soft Blue", kind: "pattern",
    style: {
      background:
        "radial-gradient(1200px 600px at 10% -10%, #dbeafe 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, #e0f2fe 0%, transparent 50%), #fafbfc",
    },
    swatch: { background: "radial-gradient(circle at 30% 30%, #dbeafe, #fafbfc 70%)" } },
];

function ts() {
  return new Date().toISOString().split("T")[1]?.replace("Z", "") ?? "";
}

function loadBgMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("storeBgMap") || "{}"); }
  catch { return {}; }
}

function Index() {
  const [activeStore, setActiveStore] = useState("Store-Alpha-Tech");
  const [storeOptions, setStoreOptions] = useState<string[]>([
    "Store-Alpha-Tech",
    "Store-Beta-Gear",
  ]);
  const [tab, setTab] = useState<Tab>("storefront");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Background templates per store
  const [bgMap, setBgMap] = useState<Record<string, string>>({});
  useEffect(() => { setBgMap(loadBgMap()); }, []);
  const currentBgId = bgMap[activeStore] || "paper";
  const currentBg = BG_TEMPLATES.find((b) => b.id === currentBgId) ?? BG_TEMPLATES[0];

  function selectBg(id: string) {
    const next = { ...bgMap, [activeStore]: id };
    setBgMap(next);
    try { localStorage.setItem("storeBgMap", JSON.stringify(next)); } catch {}
  }

  // Add store (inline, from header)
  const [newStoreName, setNewStoreName] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [provisionErr, setProvisionErr] = useState<string | null>(null);

  // Storefront
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsErr, setProductsErr] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<{ orderId: string; totalAmount: number } | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  // Inventory
  const [form, setForm] = useState({ productId: "", name: "", price: "", category: "" });
  const [injecting, setInjecting] = useState(false);
  const [injectErr, setInjectErr] = useState<string | null>(null);
  const [injectOk, setInjectOk] = useState<string | null>(null);

  const log = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((l) => [{ time: ts(), level, msg }, ...l].slice(0, 20));
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!activeStore) return;
    setLoadingProducts(true);
    setProductsErr(null);
    try {
      const res = await fetch(`${BASE_URL}/products`, { headers: { "x-store-name": activeStore } });
      if (!res.ok) throw new Error(`GET /products → ${res.status}`);
      const data = await res.json();
      const arr: Product[] = Array.isArray(data) ? data : (data.items ?? data.products ?? []);
      setProducts(arr);
      log("OK", `Loaded ${arr.length} products`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setProductsErr(m);
      log("ERR", m);
    } finally { setLoadingProducts(false); }
  }, [activeStore, log]);

  useEffect(() => {
    fetchProducts();
    setCart([]); setReceipt(null);
  }, [fetchProducts]);

  async function handleProvision() {
    if (!newStoreName.trim()) return;
    setProvisioning(true); setProvisionErr(null);
    try {
      const res = await fetch(`${BASE_URL}/provision-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: newStoreName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setStoreOptions((s) => (s.includes(newStoreName) ? s : [...s, newStoreName]));
      setActiveStore(newStoreName);
      log("OK", `Created store ${newStoreName}`);
      setNewStoreName(""); setAddStoreOpen(false);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setProvisionErr(m); log("ERR", m);
    } finally { setProvisioning(false); }
  }

  function addToCart(p: Product) {
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.productId);
      if (ex) return c.map((i) => i.productId === p.productId ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...p, qty: 1 }];
    });
  }
  function removeFromCart(id: string) { setCart((c) => c.filter((i) => i.productId !== id)); }

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + Number(i.price) * i.qty, 0), [cart]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  async function handleCheckout() {
    if (!cart.length) return;
    setCheckingOut(true); setCheckoutErr(null); setReceipt(null);
    try {
      const items = cart.flatMap((i) =>
        Array.from({ length: i.qty }).map(() => ({
          productId: i.productId, name: i.name, price: Number(i.price),
        })),
      );
      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-store-name": activeStore },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setReceipt({
        orderId: data.orderId ?? data.id ?? "—",
        totalAmount: data.totalAmount ?? data.total ?? cartTotal,
      });
      setCart([]); log("OK", `Order placed`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setCheckoutErr(m); log("ERR", m);
    } finally { setCheckingOut(false); }
  }

  async function handleInject() {
    setInjecting(true); setInjectErr(null); setInjectOk(null);
    try {
      const payload = {
        productId: form.productId, name: form.name,
        price: Number(form.price), category: form.category,
      };
      const res = await fetch(`${BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-store-name": activeStore },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setInjectOk(`Added “${payload.name}”`);
      setForm({ productId: "", name: "", price: "", category: "" });
      log("OK", `Added ${payload.productId}`);
      fetchProducts();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setInjectErr(m); log("ERR", m);
    } finally { setInjecting(false); }
  }

  return (
    <div className="min-h-screen text-foreground transition-colors" style={currentBg.style}>
      {/* HEADER */}
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-serif text-2xl leading-none">Atelier</div>
              <div className="text-[11px] tracking-widest uppercase text-muted-foreground mt-1">
                Commerce Studio
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeStore}
              onChange={(e) => setActiveStore(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => setAddStoreOpen(true)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Store
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Cart
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-background text-foreground text-[10px] px-1.5 py-0.5">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-6 pb-3 flex gap-1">
          {([
            { id: "storefront", label: "Storefront", icon: Boxes },
            { id: "inventory", label: "Inventory", icon: Wrench },
            { id: "settings", label: "Settings", icon: Settings },
          ] as { id: Tab; label: string; icon: typeof Boxes }[]).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {tab === "storefront" && (
          <Storefront
            products={products} loading={loadingProducts} err={productsErr}
            addToCart={addToCart} refresh={fetchProducts} activeStore={activeStore}
          />
        )}
        {tab === "inventory" && (
          <Inventory
            form={form} setForm={setForm} injecting={injecting}
            injectErr={injectErr} injectOk={injectOk} handleInject={handleInject}
            activeStore={activeStore}
          />
        )}
        {tab === "settings" && (
          <SettingsPanel
            activeStore={activeStore}
            currentBgId={currentBgId}
            onSelect={selectBg}
          />
        )}

        {logs.length > 0 && (
          <section className="mt-12 rounded-xl border border-border bg-card/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Activity</span>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <ul className="max-h-40 overflow-y-auto px-4 py-2 text-xs space-y-1">
              {logs.map((l, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-muted-foreground tabular-nums">{l.time}</span>
                  <span className={
                    l.level === "ERR" ? "text-destructive"
                    : l.level === "OK" ? "text-primary"
                    : "text-muted-foreground"
                  }>{l.level}</span>
                  <span>{l.msg}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* ADD STORE MODAL */}
      {addStoreOpen && (
        <Modal onClose={() => setAddStoreOpen(false)} title="Create a new store">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Store name</label>
          <input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="My Store"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {provisionErr && <p className="mt-3 text-xs text-destructive">{provisionErr}</p>}
          <button
            onClick={handleProvision}
            disabled={provisioning || !newStoreName.trim()}
            className="mt-5 w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {provisioning ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create store"}
          </button>
        </Modal>
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <aside className="w-full max-w-md bg-background border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-serif text-xl">Your cart</h3>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 && !receipt && (
                <p className="text-sm text-muted-foreground text-center py-10">Your cart is empty.</p>
              )}
              {cart.map((i) => (
                <div key={i.productId} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Qty {i.qty}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">${(Number(i.price) * i.qty).toFixed(2)}</div>
                    <button onClick={() => removeFromCart(i.productId)} className="mt-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {checkoutErr && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5" /> {checkoutErr}
                </div>
              )}
              {receipt && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    <Receipt className="h-4 w-4" /> Order confirmed
                  </div>
                  <dl className="mt-3 text-xs space-y-1">
                    <Row label="Store" value={activeStore} />
                    <Row label="Order ID" value={receipt.orderId} />
                    <Row label="Total" value={`$${Number(receipt.totalAmount).toFixed(2)}`} />
                  </dl>
                </div>
              )}
            </div>
            <div className="border-t border-border p-5">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={!cart.length || checkingOut}
                className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checkingOut ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : "Checkout"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ---------- Storefront ---------- */
function Storefront({ products, loading, err, addToCart, refresh, activeStore }: {
  products: Product[]; loading: boolean; err: string | null;
  addToCart: (p: Product) => void; refresh: () => void; activeStore: string;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-5xl leading-none">{activeStore}</h1>
          <p className="text-muted-foreground mt-2 text-sm">A quiet shop. Considered things, made well.</p>
        </div>
        <button onClick={refresh} className="text-sm text-muted-foreground hover:text-foreground">Refresh</button>
      </div>

      {loading && <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
      {err && <ErrorBox msg={err} />}
      {!loading && !err && products.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No products yet. Add some in <span className="text-foreground">Inventory</span>.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <article key={p.productId}
            className="group rounded-xl border border-border bg-card/90 backdrop-blur p-5 hover:shadow-sm transition">
            <div className="aspect-[4/3] rounded-lg bg-secondary/60 mb-4 flex items-center justify-center">
              <span className="font-serif text-3xl text-muted-foreground">{p.name.charAt(0)}</span>
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{p.category || "General"}</div>
            <h3 className="font-serif text-xl mt-1">{p.name}</h3>
            <div className="flex items-center justify-between mt-4">
              <span className="text-base">${Number(p.price).toFixed(2)}</span>
              <button
                onClick={() => addToCart(p)}
                className="rounded-md bg-foreground text-background px-3 py-1.5 text-xs inline-flex items-center gap-1.5 hover:opacity-90"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Inventory ---------- */
function Inventory({ form, setForm, injecting, injectErr, injectOk, handleInject, activeStore }: {
  form: { productId: string; name: string; price: string; category: string };
  setForm: (f: { productId: string; name: string; price: string; category: string }) => void;
  injecting: boolean; injectErr: string | null; injectOk: string | null;
  handleInject: () => void; activeStore: string;
}) {
  const ready = form.productId.trim() && form.name.trim() && form.price.trim() && form.category.trim();
  return (
    <section className="max-w-2xl">
      <h1 className="font-serif text-4xl">Add a product</h1>
      <p className="text-sm text-muted-foreground mt-1">Saving to <span className="text-foreground">{activeStore}</span></p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="Product ID" value={form.productId} onChange={(v) => setForm({ ...form, productId: v })} placeholder="sku-001" />
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Linen Tote" />
        <Field label="Price (USD)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="49.00" type="number" />
        <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Bags" />
      </div>

      <button
        onClick={handleInject}
        disabled={!ready || injecting}
        className="mt-6 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
      >
        {injecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save product"}
      </button>

      {injectErr && <ErrorBox msg={injectErr} />}
      {injectOk && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {injectOk}
        </div>
      )}
    </section>
  );
}

/* ---------- Settings (Background Template Picker) ---------- */
function SettingsPanel({ activeStore, currentBgId, onSelect }: {
  activeStore: string; currentBgId: string; onSelect: (id: string) => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Personalise <span className="text-foreground">{activeStore}</span>.
      </p>

      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">Background template</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Pick a backdrop for your storefront. Saved per store.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BG_TEMPLATES.map((b) => {
            const active = b.id === currentBgId;
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b.id)}
                className={`group relative rounded-xl border overflow-hidden text-left transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                }`}
              >
                <div className="h-28 w-full" style={b.swatch} />
                <div className="flex items-center justify-between px-3 py-2 bg-card">
                  <div>
                    <div className="text-sm">{b.label}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.kind}</div>
                  </div>
                  {active && (
                    <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Primitives ---------- */
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right break-all">{value}</dd>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive inline-flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="break-all">{msg}</span>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
