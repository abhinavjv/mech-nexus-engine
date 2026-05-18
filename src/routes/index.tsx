import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Cpu,
  Boxes,
  Wrench,
  ShoppingCart,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Trash2,
  Receipt,
  Power,
  Database,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const BASE_URL = "https://o2dkvnfpyf.execute-api.ap-south-1.amazonaws.com/dev";

type Product = {
  productId: string;
  name: string;
  price: number;
  category: string;
};

type CartItem = Product & { qty: number };

type Tab = "control" | "storefront" | "merchant";

type LogEntry = { time: string; level: "INFO" | "ERR" | "OK"; msg: string };

function ts() {
  const d = new Date();
  return d.toISOString().split("T")[1]?.replace("Z", "") ?? "";
}

function Index() {
  const [activeStore, setActiveStore] = useState<string>("Store-Alpha-Tech");
  const [storeOptions, setStoreOptions] = useState<string[]>([
    "Store-Alpha-Tech",
    "Store-Beta-Gear",
  ]);
  const [tab, setTab] = useState<Tab>("control");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Control plane
  const [newStoreName, setNewStoreName] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    productsTable?: string;
    ordersTable?: string;
    storeName?: string;
  } | null>(null);
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

  // Merchant
  const [form, setForm] = useState({
    productId: "",
    name: "",
    price: "",
    category: "",
  });
  const [injecting, setInjecting] = useState(false);
  const [injectErr, setInjectErr] = useState<string | null>(null);
  const [injectOk, setInjectOk] = useState<string | null>(null);

  const log = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((l) => [{ time: ts(), level, msg }, ...l].slice(0, 30));
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!activeStore) return;
    setLoadingProducts(true);
    setProductsErr(null);
    try {
      const res = await fetch(`${BASE_URL}/products`, {
        headers: { "x-store-name": activeStore },
      });
      if (!res.ok) throw new Error(`GET /products → HTTP ${res.status}`);
      const data = await res.json();
      const arr: Product[] = Array.isArray(data) ? data : (data.items ?? data.products ?? []);
      setProducts(arr);
      log("OK", `Fetched ${arr.length} products for ${activeStore}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setProductsErr(m);
      log("ERR", `Catalog fetch: ${m}`);
    } finally {
      setLoadingProducts(false);
    }
  }, [activeStore, log]);

  useEffect(() => {
    fetchProducts();
    setCart([]);
    setReceipt(null);
  }, [fetchProducts]);

  async function handleProvision() {
    if (!newStoreName.trim()) return;
    setProvisioning(true);
    setProvisionErr(null);
    setProvisionResult(null);
    log("INFO", `Provisioning infra for "${newStoreName}"...`);
    try {
      const res = await fetch(`${BASE_URL}/provision-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: newStoreName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setProvisionResult({ ...data, storeName: newStoreName });
      setStoreOptions((s) => (s.includes(newStoreName) ? s : [...s, newStoreName]));
      log("OK", `Provisioned ${newStoreName}`);
      setNewStoreName("");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setProvisionErr(m);
      log("ERR", `Provision: ${m}`);
    } finally {
      setProvisioning(false);
    }
  }

  function addToCart(p: Product) {
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.productId);
      if (existing) {
        return c.map((i) => (i.productId === p.productId ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { ...p, qty: 1 }];
    });
    log("INFO", `+ ${p.name} → cart`);
  }

  function removeFromCart(id: string) {
    setCart((c) => c.filter((i) => i.productId !== id));
  }

  const cartTotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setCheckoutErr(null);
    setReceipt(null);
    try {
      const items = cart.flatMap((i) =>
        Array.from({ length: i.qty }).map(() => ({
          productId: i.productId,
          name: i.name,
          price: Number(i.price),
        })),
      );
      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-store-name": activeStore,
        },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setReceipt({
        orderId: data.orderId ?? data.id ?? "UNKNOWN",
        totalAmount: data.totalAmount ?? data.total ?? cartTotal,
      });
      setCart([]);
      log("OK", `Order ${data.orderId ?? "?"} executed`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setCheckoutErr(m);
      log("ERR", `Checkout: ${m}`);
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleInject() {
    setInjecting(true);
    setInjectErr(null);
    setInjectOk(null);
    try {
      const payload = {
        productId: form.productId,
        name: form.name,
        price: Number(form.price),
        category: form.category,
      };
      const res = await fetch(`${BASE_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-store-name": activeStore,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setInjectOk(`Item ${payload.productId} written to dissociated storage.`);
      setForm({ productId: "", name: "", price: "", category: "" });
      log("OK", `Injected ${payload.productId}`);
      fetchProducts();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setInjectErr(m);
      log("ERR", `Inject: ${m}`);
    } finally {
      setInjecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-mono text-zinc-200 selection:bg-amber-500 selection:text-zinc-950">
      {/* TOP BAR */}
      <header className="border-b-2 border-zinc-700 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-amber-500 bg-zinc-950">
              <Cpu className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                AWS // ap-south-1 // dev
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-zinc-100">
                MULTI-TENANT.COMMERCE.CTL
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-2 border-emerald-600/60 bg-zinc-950 px-2 py-1">
              <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-500">
                LINK_ONLINE
              </span>
            </div>
            <div className="flex items-center gap-2 border-2 border-zinc-700 bg-zinc-950 px-2 py-1">
              <Database className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">
                TENANT
              </span>
              <select
                value={activeStore}
                onChange={(e) => setActiveStore(e.target.value)}
                className="bg-zinc-950 text-xs uppercase tracking-wider text-amber-500 outline-none"
              >
                {storeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABS */}
        <nav className="mx-auto flex max-w-7xl gap-0 border-t-2 border-zinc-800 px-4">
          {([
            { id: "control", label: "CONTROL PLANE", icon: Power },
            { id: "storefront", label: "STOREFRONT", icon: Boxes },
            { id: "merchant", label: "INVENTORY", icon: Wrench },
          ] as { id: Tab; label: string; icon: typeof Power }[]).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 border-r-2 border-zinc-800 px-4 py-3 text-[11px] uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-zinc-950 text-amber-500 shadow-[inset_0_2px_0_0_theme(colors.amber.500)]"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center">
            {tab === "storefront" && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 border-l-2 border-zinc-800 px-4 py-3 text-[11px] uppercase tracking-widest text-emerald-500 hover:bg-zinc-950"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                CART
                {cartCount > 0 && (
                  <span className="ml-1 border-2 border-emerald-500 bg-emerald-500/10 px-1.5 text-emerald-400">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "control" && (
          <ControlPlane
            newStoreName={newStoreName}
            setNewStoreName={setNewStoreName}
            handleProvision={handleProvision}
            provisioning={provisioning}
            provisionErr={provisionErr}
            provisionResult={provisionResult}
          />
        )}

        {tab === "storefront" && (
          <Storefront
            products={products}
            loading={loadingProducts}
            err={productsErr}
            addToCart={addToCart}
            refresh={fetchProducts}
            activeStore={activeStore}
          />
        )}

        {tab === "merchant" && (
          <Merchant
            form={form}
            setForm={setForm}
            injecting={injecting}
            injectErr={injectErr}
            injectOk={injectOk}
            handleInject={handleInject}
            activeStore={activeStore}
          />
        )}

        {/* DIAGNOSTIC LOG */}
        <section className="mt-8 border-2 border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              <Radio className="h-3 w-3 text-amber-500" />
              SYS.DIAGNOSTIC.LOG
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-amber-500"
            >
              PURGE
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto px-3 py-2 text-[11px]">
            {logs.length === 0 && (
              <div className="text-zinc-600">// awaiting telemetry...</div>
            )}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="text-zinc-600">{l.time}</span>
                <span
                  className={
                    l.level === "ERR"
                      ? "text-red-500"
                      : l.level === "OK"
                        ? "text-emerald-500"
                        : "text-amber-500"
                  }
                >
                  [{l.level}]
                </span>
                <span className="text-zinc-300">{l.msg}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* CART SLIDE-OUT */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/60"
            onClick={() => setCartOpen(false)}
          />
          <aside className="w-full max-w-md border-l-2 border-zinc-700 bg-zinc-950">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-500">
                <ShoppingCart className="h-4 w-4" />
                CHECKOUT.MODULE
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="border-2 border-zinc-700 p-1 text-zinc-400 hover:border-red-500 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex h-[calc(100vh-56px)] flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {cart.length === 0 && !receipt && (
                  <div className="border-2 border-dashed border-zinc-800 p-6 text-center text-xs uppercase tracking-widest text-zinc-600">
                    // BUFFER EMPTY
                  </div>
                )}
                {cart.map((i) => (
                  <div
                    key={i.productId}
                    className="mb-2 border-2 border-zinc-800 bg-zinc-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                          {i.productId}
                        </div>
                        <div className="text-sm text-zinc-100">{i.name}</div>
                      </div>
                      <button
                        onClick={() => removeFromCart(i.productId)}
                        className="text-zinc-500 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">QTY × {i.qty}</span>
                      <span className="text-amber-500">
                        ${(Number(i.price) * i.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {checkoutErr && (
                  <div className="mt-3 border-2 border-red-600 bg-red-950/30 p-3 text-xs text-red-400">
                    <div className="mb-1 flex items-center gap-2 uppercase tracking-widest">
                      <AlertTriangle className="h-3.5 w-3.5" /> TX FAULT
                    </div>
                    {checkoutErr}
                  </div>
                )}

                {receipt && (
                  <div className="mt-3 border-2 border-emerald-600 bg-zinc-900 p-4 shadow-[0_0_30px_-10px_theme(colors.emerald.500)]">
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-500">
                      <Receipt className="h-3.5 w-3.5" />
                      RECEIPT.PAYLOAD
                    </div>
                    <div className="border-t-2 border-dashed border-zinc-700 pt-2 text-xs">
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">TENANT</span>
                        <span className="text-zinc-100">{activeStore}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">ORDER_ID</span>
                        <span className="text-amber-500">{receipt.orderId}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-500">TOTAL</span>
                        <span className="text-emerald-500">
                          ${Number(receipt.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-zinc-800 bg-zinc-900 p-4">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest">
                  <span className="text-zinc-500">SUBTOTAL</span>
                  <span className="text-lg text-amber-500">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || checkingOut}
                  className="flex w-full items-center justify-center gap-2 border-2 border-emerald-500 bg-emerald-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400 transition hover:bg-emerald-500 hover:text-zinc-950 hover:shadow-[0_0_25px_-5px_theme(colors.emerald.500)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> EXECUTING...
                    </>
                  ) : (
                    <>EXECUTE SECURE CHECKOUT</>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ---------- CONTROL PLANE ---------- */
function ControlPlane(props: {
  newStoreName: string;
  setNewStoreName: (v: string) => void;
  handleProvision: () => void;
  provisioning: boolean;
  provisionErr: string | null;
  provisionResult: { productsTable?: string; ordersTable?: string; storeName?: string } | null;
}) {
  const {
    newStoreName,
    setNewStoreName,
    handleProvision,
    provisioning,
    provisionErr,
    provisionResult,
  } = props;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="border-2 border-zinc-700 bg-zinc-900">
        <Header icon={<Power className="h-4 w-4" />} title="PROVISION.NEW.TENANT" />
        <div className="p-4">
          <Label>STORE_NAME</Label>
          <input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="e.g. Store-Gamma-Forge"
            className="mt-1 w-full border-2 border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-amber-500 outline-none placeholder:text-zinc-600 focus:border-amber-500"
          />
          <button
            onClick={handleProvision}
            disabled={provisioning || !newStoreName.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 border-2 border-amber-500 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400 transition hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_25px_-5px_theme(colors.amber.500)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {provisioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> PROVISIONING_INFRA...
              </>
            ) : (
              <>PROVISION INFRASTRUCTURE</>
            )}
          </button>

          {provisioning && (
            <div className="mt-4 border-2 border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="uppercase tracking-widest text-amber-500">
                  SPINNING_UP DYNAMO_TABLES...
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden bg-zinc-800">
                <div className="h-full w-1/2 animate-pulse bg-amber-500" />
              </div>
            </div>
          )}

          {provisionErr && <ErrorBox msg={provisionErr} />}

          {provisionResult && (
            <div className="mt-4 border-2 border-emerald-500 bg-zinc-950 p-4 shadow-[0_0_30px_-10px_theme(colors.emerald.500)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                INFRA_DEPLOYED
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <KV k="STORE" v={provisionResult.storeName ?? "-"} />
                <KV k="PRODUCTS_TABLE" v={provisionResult.productsTable ?? "-"} />
                <KV k="ORDERS_TABLE" v={provisionResult.ordersTable ?? "-"} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-2 border-zinc-700 bg-zinc-900">
        <Header icon={<Cpu className="h-4 w-4" />} title="OPERATOR.BRIEF" />
        <div className="space-y-3 p-4 text-xs leading-relaxed text-zinc-400">
          <p>
            <span className="text-amber-500">// 01</span> Use{" "}
            <span className="text-emerald-500">PROVISION</span> to spin up a
            dedicated DynamoDB pair (products + orders) for a new tenant.
          </p>
          <p>
            <span className="text-amber-500">// 02</span> Select the{" "}
            <span className="text-emerald-500">TENANT</span> in the top-right.
            All subsequent <code className="text-amber-500">x-store-name</code>{" "}
            headers are routed to that store.
          </p>
          <p>
            <span className="text-amber-500">// 03</span> Use{" "}
            <span className="text-emerald-500">INVENTORY</span> to inject SKUs
            into the active tenant&apos;s isolated storage.
          </p>
          <p>
            <span className="text-amber-500">// 04</span> Use{" "}
            <span className="text-emerald-500">STOREFRONT</span> to simulate the
            consumer surface and execute orders.
          </p>
          <div className="mt-4 border-2 border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              ENDPOINT_BASE
            </div>
            <div className="mt-1 break-all text-[11px] text-amber-500">
              {BASE_URL}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- STOREFRONT ---------- */
function Storefront(props: {
  products: Product[];
  loading: boolean;
  err: string | null;
  addToCart: (p: Product) => void;
  refresh: () => void;
  activeStore: string;
}) {
  const { products, loading, err, addToCart, refresh, activeStore } = props;
  return (
    <section className="border-2 border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between border-b-2 border-zinc-700 bg-zinc-950 px-4 py-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-amber-500">
          <Boxes className="h-4 w-4" />
          CATALOG // {activeStore}
        </div>
        <button
          onClick={refresh}
          className="border-2 border-zinc-700 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-400 hover:border-amber-500 hover:text-amber-500"
        >
          RE-SYNC
        </button>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <Loader2 className="h-4 w-4 animate-spin" /> FETCHING_CATALOG...
          </div>
        )}
        {err && <ErrorBox msg={err} />}
        {!loading && !err && products.length === 0 && (
          <div className="border-2 border-dashed border-zinc-800 p-8 text-center text-xs uppercase tracking-widest text-zinc-600">
            // NO SKUS RETURNED FROM TENANT
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.productId}
              className="group flex flex-col border-2 border-zinc-700 bg-zinc-950 transition hover:border-amber-500"
            >
              <div className="flex items-start justify-between border-b-2 border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  ID :: {p.productId}
                </span>
                <span className="border border-emerald-600 px-1 text-[9px] uppercase tracking-widest text-emerald-500">
                  {p.category || "UNCAT"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="text-sm font-bold uppercase tracking-wide text-zinc-100">
                  {p.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    USD
                  </span>
                  <span className="text-xl text-amber-500">
                    {Number(p.price).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  className="mt-4 flex items-center justify-center gap-2 border-2 border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-zinc-300 transition group-hover:border-emerald-500 group-hover:text-emerald-400"
                >
                  <Plus className="h-3 w-3" /> ADD TO CART
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- MERCHANT ---------- */
function Merchant(props: {
  form: { productId: string; name: string; price: string; category: string };
  setForm: (f: { productId: string; name: string; price: string; category: string }) => void;
  injecting: boolean;
  injectErr: string | null;
  injectOk: string | null;
  handleInject: () => void;
  activeStore: string;
}) {
  const { form, setForm, injecting, injectErr, injectOk, handleInject, activeStore } = props;
  const ready =
    form.productId.trim() && form.name.trim() && form.price.trim() && form.category.trim();
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="border-2 border-zinc-700 bg-zinc-900 md:col-span-2">
        <Header
          icon={<Wrench className="h-4 w-4" />}
          title={`INJECT.SKU // ${activeStore}`}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field
            label="PRODUCT_ID"
            value={form.productId}
            onChange={(v) => setForm({ ...form, productId: v })}
            placeholder="SKU-001"
          />
          <Field
            label="PRODUCT_NAME"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Hydraulic Widget"
          />
          <Field
            label="PRICE_USD"
            value={form.price}
            onChange={(v) => setForm({ ...form, price: v })}
            placeholder="49.99"
            type="number"
          />
          <Field
            label="CATEGORY"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            placeholder="HARDWARE"
          />
          <div className="sm:col-span-2">
            <button
              onClick={handleInject}
              disabled={!ready || injecting}
              className="flex w-full items-center justify-center gap-2 border-2 border-amber-500 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400 transition hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_25px_-5px_theme(colors.amber.500)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {injecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> WRITING...
                </>
              ) : (
                <>INJECT ITEM INTO DISSOCIATED STORAGE</>
              )}
            </button>
            {injectErr && <ErrorBox msg={injectErr} />}
            {injectOk && (
              <div className="mt-4 border-2 border-emerald-500 bg-zinc-950 p-3 text-xs text-emerald-400 shadow-[0_0_25px_-10px_theme(colors.emerald.500)]">
                <div className="flex items-center gap-2 uppercase tracking-widest">
                  <CheckCircle2 className="h-3.5 w-3.5" /> COMMIT_OK
                </div>
                <div className="mt-1 text-zinc-300">{injectOk}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-2 border-zinc-700 bg-zinc-900">
        <Header icon={<Database className="h-4 w-4" />} title="SCHEMA" />
        <div className="space-y-2 p-4 text-[11px] text-zinc-400">
          <SchemaRow k="productId" t="string" />
          <SchemaRow k="name" t="string" />
          <SchemaRow k="price" t="number" />
          <SchemaRow k="category" t="string" />
          <div className="mt-3 border-2 border-zinc-800 bg-zinc-950 p-2 text-[10px]">
            <div className="text-zinc-500">HEADER</div>
            <div className="text-amber-500">
              x-store-name: {activeStore}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- BUILDING BLOCKS ---------- */
function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-zinc-700 bg-zinc-950 px-4 py-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-amber-500">
        {icon}
        {title}
      </div>
      <div className="flex gap-1">
        <span className="h-2 w-2 bg-emerald-500" />
        <span className="h-2 w-2 bg-amber-500" />
        <span className="h-2 w-2 bg-red-500" />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border-2 border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-amber-500 outline-none placeholder:text-zinc-600 focus:border-amber-500"
      />
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-800 py-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        {k}
      </span>
      <span className="break-all text-right text-amber-500">{v}</span>
    </div>
  );
}

function SchemaRow({ k, t }: { k: string; t: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-zinc-800 py-1">
      <span className="text-zinc-300">{k}</span>
      <span className="text-emerald-500">{t}</span>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mt-4 border-2 border-red-600 bg-red-950/30 p-3 text-xs text-red-400">
      <div className="mb-1 flex items-center gap-2 uppercase tracking-widest">
        <AlertTriangle className="h-3.5 w-3.5" /> DIAG_FAULT
      </div>
      <code className="break-all">{msg}</code>
    </div>
  );
}
