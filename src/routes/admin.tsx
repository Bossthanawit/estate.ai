import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminListProperties, adminDeleteProperty, adminUpsertProperty, adminGetAnalytics } from "@/lib/properties.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Building2, LogOut, Trash2, Plus, BarChart3, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Estate AI" }] }),
  component: AdminPage,
});

function AdminPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"properties" | "analytics">("properties");
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        nav({ to: "/login" });
      } else {
        setUserId(data.user.id);
        setAuthChecking(false);
      }
    });
  }, [nav]);

  if (authChecking) return <div className="p-10 text-sm text-muted-foreground">Checking access…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="font-serif text-lg font-semibold">Estate AI · Admin</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{userId?.slice(0, 8)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">View site</Link>
            <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/login" }); }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1400px] gap-1 px-6">
          <TabBtn active={tab === "properties"} onClick={() => setTab("properties")} icon={<Building2 className="h-3.5 w-3.5" />}>Properties</TabBtn>
          <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<BarChart3 className="h-3.5 w-3.5" />}>Analytics & Logs</TabBtn>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {tab === "properties" ? <PropertiesTab /> : <AnalyticsTab />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

function PropertiesTab() {
  const list = useServerFn(adminListProperties);
  const del = useServerFn(adminDeleteProperty);
  const upsert = useServerFn(adminUpsertProperty);
  const [search, setSearch] = useState("");
  const { data, refetch, isError, error } = useQuery({
    queryKey: ["admin-properties", search],
    queryFn: () => list({ data: { search, limit: 100 } }),
    retry: false,
  });
  const [editing, setEditing] = useState<any | null>(null);

  if (isError) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
      Access denied. Your account is not an admin. Ask the database owner to insert <code className="bg-secondary px-1">('admin')</code> into <code className="bg-secondary px-1">user_roles</code> for your user.
      <div className="mt-2 text-xs text-muted-foreground">{(error as Error)?.message}</div>
    </div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
          className="flex-1 max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={() => setEditing({ name: "", description: "", property_type: "condo", listing_type: "rent", price: 25000, bedrooms: 1, bathrooms: 1, area_sqm: 40, area_name: "Asok", lat: 13.7373, lng: 100.5601, address: "", image_url: "", availability_status: "available", tags: [] })}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{data?.total ?? 0} total</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Area</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.area_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.property_type} · {r.listing_type}</td>
                <td className="px-3 py-2 text-right">฿{Number(r.price).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{r.availability_status}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(r)} className="text-xs text-primary hover:underline mr-3">Edit</button>
                  <button onClick={async () => {
                    if (!confirm("Delete?")) return;
                    try { await del({ data: { id: r.id } }); toast.success("Deleted"); refetch(); }
                    catch (e) { toast.error((e as Error).message); }
                  }} className="text-xs text-destructive hover:underline"><Trash2 className="inline h-3 w-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
            e.preventDefault();
            try {
              const payload: any = { ...editing, price: Number(editing.price), bedrooms: Number(editing.bedrooms), bathrooms: Number(editing.bathrooms), area_sqm: Number(editing.area_sqm), lat: Number(editing.lat), lng: Number(editing.lng) };
              if (!payload.id) delete payload.id;
              await upsert({ data: payload });
              toast.success("Saved");
              setEditing(null);
              refetch();
            } catch (err) { toast.error((err as Error).message); }
          }} className="w-full max-w-2xl space-y-3 rounded-2xl bg-card p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg font-semibold">{editing.id ? "Edit" : "New"} property</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["name", "Name", "text"], ["area_name", "Area", "text"],
                ["property_type", "Type (condo/house/townhouse/commercial)", "text"],
                ["listing_type", "Listing (rent/sale)", "text"],
                ["price", "Price", "number"], ["bedrooms", "Bedrooms", "number"],
                ["bathrooms", "Bathrooms", "number"], ["area_sqm", "Area sqm", "number"],
                ["lat", "Lat", "number"], ["lng", "Lng", "number"],
                ["availability_status", "Status (available/reserved/sold)", "text"],
                ["image_url", "Image URL", "text"],
              ].map(([k, l, t]) => (
                <label key={k} className="text-xs">
                  <span className="text-muted-foreground">{l}</span>
                  <input type={t} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                </label>
              ))}
              <label className="col-span-2 text-xs">
                <span className="text-muted-foreground">Description</span>
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" rows={2} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-xs">Cancel</button>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const get = useServerFn(adminGetAnalytics);
  const { data, isError, error } = useQuery({ queryKey: ["analytics"], queryFn: () => get({}), retry: false });

  if (isError) return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">Admin access required. {(error as Error)?.message}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Properties" value={data.counts.properties} />
        <Stat label="Chat sessions" value={data.counts.sessions} />
        <Stat label="Chat logs" value={data.counts.logs} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-medium">Properties by area</h4>
          <ul className="space-y-1 text-xs">
            {Object.entries(data.byArea).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="text-muted-foreground">{v as number}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-medium">Properties by type</h4>
          <ul className="space-y-1 text-xs">
            {Object.entries(data.byType).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="text-muted-foreground">{v as number}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Recent chat logs</h4>
        <div className="max-h-96 space-y-2 overflow-y-auto text-xs">
          {data.logs.map((l: any) => (
            <div key={l.id} className="rounded-md bg-secondary/40 p-2">
              <div className="flex justify-between">
                <span className="font-medium">{l.role}</span>
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1">{l.content}</div>
              {l.filters_applied && Object.keys(l.filters_applied).length > 0 && (
                <pre className="mt-1 text-[10px] text-muted-foreground">{JSON.stringify(l.filters_applied)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl font-semibold">{value}</div>
    </div>
  );
}
