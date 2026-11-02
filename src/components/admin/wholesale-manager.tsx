"use client";

import { useState, useTransition } from "react";
import {
  approveWholesaleApplicationAction,
  rejectWholesaleApplicationAction,
  setWholesaleByEmailAction,
  updateWholesalePriceAction,
  reviewWholesaleCheckoutRequestAction,
  type WholesaleActionResult,
} from "@/app/actions/wholesale";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  User,
  Phone,
  FileText,
  Mail,
  Search,
  AlertCircle,
  MessageCircle,
  Building2,
  ShieldCheck,
  UserX,
  TrendingDown,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
  Save,
} from "lucide-react";
import { adminCard, adminInput } from "@/components/admin/commerce-ui";
import { formatCurrency } from "@/lib/format";

export interface WholesaleProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  cuit: string | null;
  wholesaleNotes: string | null;
  wholesaleRequestedAt: string | null;
  isApprovedWholesale: boolean;
  customerTier: string | null;
  createdAt: string;
}

export interface WholesaleProductMargin {
  id: string;
  title: string;
  categoryName: string;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  landedCost: number;
  marginPct: number;
  netProfit: number;
  suggestedWholesalePrice: number;
}

export interface WholesaleCheckoutRequest {
  id: string;
  requestId: string;
  reference: string;
  contact: { name?: string; email?: string; phone?: string; address?: string };
  selection: Array<{ productId?: string; variantId?: string | null; quantity: number; title?: string; channel?: string }>;
  status: "pending_confirmation" | "confirmed" | "rejected";
  reasons: string[];
  reviewNotes: string;
  reviewedAt: string | null;
  createdAt: string;
}

interface Props {
  pendingApplications: WholesaleProfile[];
  approvedWholesalers: WholesaleProfile[];
  productMargins: WholesaleProductMargin[];
  checkoutRequests?: WholesaleCheckoutRequest[];
}

export function WholesaleManager({
  pendingApplications: initialPending,
  approvedWholesalers: initialApproved,
  productMargins: initialMargins,
  checkoutRequests: initialRequests = [],
}: Props) {
  const [pendingList, setPendingList] = useState(initialPending);
  const [approvedList, setApprovedList] = useState(initialApproved);
  const [marginsList, setMarginsList] = useState(initialMargins);
  const [requestsList, setRequestsList] = useState(initialRequests);
  const [manualEmail, setManualEmail] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "margins" | "requests">("requests");
  const [filterSearch, setFilterSearch] = useState("");
  const [marginFilter, setMarginFilter] = useState<"all" | "low" | "critical" | "healthy">("low");
  const [customPriceEdits, setCustomPriceEdits] = useState<Record<string, number>>({});

  const lowMarginCount = marginsList.filter((p) => p.marginPct < 25).length;
  const criticalMarginCount = marginsList.filter((p) => p.marginPct < 15).length;

  const handleApprove = (profile: WholesaleProfile) => {
    if (!confirm(`¿Aprobar a ${profile.fullName || profile.email} como cliente mayorista?`)) return;

    startTransition(async () => {
      const res = await approveWholesaleApplicationAction(profile.id);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Cliente aprobado con éxito. Se enviará email de bienvenida." });
        setPendingList((prev) => prev.filter((p) => p.id !== profile.id));
        setApprovedList((prev) => [{ ...profile, isApprovedWholesale: true, customerTier: "wholesale" }, ...prev]);
      } else {
        setActionMessage({ type: "error", text: res.error || "Ocurrió un error al aprobar." });
      }
    });
  };

  const handleReject = (profile: WholesaleProfile) => {
    const reason = prompt(`Motivo de rechazo o nota (opcional):`, "No cumple con los requisitos comerciales");
    if (reason === null) return;

    startTransition(async () => {
      const res = await rejectWholesaleApplicationAction(profile.id, reason);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Postulación rechazada." });
        setPendingList((prev) => prev.filter((p) => p.id !== profile.id));
      } else {
        setActionMessage({ type: "error", text: res.error || "Ocurrió un error al rechazar." });
      }
    });
  };

  const handleRevoke = (profile: WholesaleProfile) => {
    if (!confirm(`¿Revocar acceso mayorista a ${profile.fullName || profile.email}? Volverá a modo minorista.`)) return;

    startTransition(async () => {
      const res = await rejectWholesaleApplicationAction(profile.id, "Revocado por administración");
      if (res.success) {
        setActionMessage({ type: "success", text: "Condición mayorista revocada con éxito." });
        setApprovedList((prev) => prev.filter((p) => p.id !== profile.id));
      } else {
        setActionMessage({ type: "error", text: res.error || "Ocurrió un error al revocar." });
      }
    });
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    startTransition(async () => {
      const res = await setWholesaleByEmailAction(manualEmail.trim(), true);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Usuario habilitado como mayorista." });
        setManualEmail("");
        window.location.reload();
      } else {
        setActionMessage({ type: "error", text: res.error || "No se pudo habilitar el usuario." });
      }
    });
  };

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    startTransition(async () => {
      const res = await updateWholesalePriceAction(productId, newPrice);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Precio actualizado." });
        setMarginsList((prev) =>
          prev.map((item) => {
            if (item.id !== productId) return item;
            const newMarginPct = Math.round(((newPrice - item.landedCost) / newPrice) * 1000) / 10;
            const newNetProfit = newPrice - item.landedCost;
            return {
              ...item,
              wholesalePrice: newPrice,
              marginPct: newMarginPct,
              netProfit: newNetProfit,
            };
          })
        );
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al actualizar precio." });
      }
    });
  };

  const handleReviewRequest = (req: WholesaleCheckoutRequest, status: "confirmed" | "rejected") => {
    const notes = prompt(`Nota de revisión para ${req.reference} (opcional):`, "") ?? "";
    startTransition(async () => {
      const res = await reviewWholesaleCheckoutRequestAction(req.id, status, notes);
      if (res.success) {
        setActionMessage({ type: "success", text: res.message || "Solicitud actualizada." });
        setRequestsList((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status, reviewNotes: notes, reviewedAt: new Date().toISOString() } : r))
        );
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al revisar solicitud." });
      }
    });
  };

  const filteredRequests = requestsList.filter((r) => {
    if (!filterSearch) return true;
    const term = filterSearch.toLowerCase();
    return (
      r.reference?.toLowerCase().includes(term) ||
      r.contact?.name?.toLowerCase().includes(term) ||
      r.contact?.email?.toLowerCase().includes(term) ||
      r.contact?.phone?.toLowerCase().includes(term) ||
      r.status?.toLowerCase().includes(term)
    );
  });

  const filteredPending = pendingList.filter((p) => {
    if (!filterSearch) return true;
    const term = filterSearch.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.businessName?.toLowerCase().includes(term) ||
      p.cuit?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term)
    );
  });

  const filteredApproved = approvedList.filter((p) => {
    if (!filterSearch) return true;
    const term = filterSearch.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.businessName?.toLowerCase().includes(term) ||
      p.cuit?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term)
    );
  });

  const filteredMargins = marginsList.filter((p) => {
    if (marginFilter === "low" && p.marginPct >= 25) return false;
    if (marginFilter === "critical" && p.marginPct >= 15) return false;
    if (marginFilter === "healthy" && p.marginPct < 25) return false;

    if (!filterSearch) return true;
    const term = filterSearch.toLowerCase();
    return p.title.toLowerCase().includes(term) || p.categoryName.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Mensaje de feedback */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl p-4 text-sm font-semibold shadow-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Habilitación Rápida por Email */}
      <form onSubmit={handleManualAdd} className={`${adminCard} flex flex-wrap items-end gap-3`}>
        <div className="min-w-0 flex-[2_1_260px]">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-zinc-500" />
            <span>Habilitación rápida por email</span>
          </label>
          <input
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            disabled={isPending}
            className={adminInput}
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !manualEmail.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Habilitar como Mayorista</span>
        </button>
      </form>

      {/* Tabs Principales */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "requests"
                ? "bg-sky-800 text-white shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Pedidos Mayoristas (SOL)</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${activeTab === "requests" ? "bg-white/20 text-white" : "bg-zinc-950/10 text-zinc-900"}`}>
              {requestsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "pending"
                ? "bg-amber-400 text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Solicitudes Pendientes</span>
            <span className="rounded-full bg-zinc-950/10 px-2 py-0.5 text-xs font-extrabold">
              {pendingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Mayoristas Aprobados</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-extrabold">
              {approvedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("margins")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "margins"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Márgenes & Alertas (&lt; 25%)</span>
            {lowMarginCount > 0 && (
              <span className="rounded-full bg-amber-400 text-zinc-950 px-2 py-0.5 text-xs font-black animate-pulse">
                {lowMarginCount} alertas
              </span>
            )}
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Buscar por nombre, email, producto..."
            className="w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none"
          />
        </div>
      </div>

      {/* PESTAÑA 0: PEDIDOS MAYORISTAS (SOL-...) */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className={`${adminCard} py-12 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900">
                {filterSearch ? "No hay solicitudes con ese filtro" : "No hay pedidos mayoristas pendientes de confirmación"}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Cuando un comprador arme un pedido mayorista con productos bajo cotización o disponibilidad a revisar, aparecerá aquí con referencia SOL-... para su confirmación.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div key={req.id} className={`${adminCard} p-5 space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                        {req.reference}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        req.status === "confirmed" ? "bg-emerald-100 text-emerald-800" :
                        req.status === "rejected" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {req.status === "confirmed" ? "Confirmada" : req.status === "rejected" ? "Rechazada" : "Pendiente de Confirmación"}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(req.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <div>
                      <p className="font-semibold text-zinc-700">Contacto</p>
                      <p className="text-zinc-900">{req.contact?.name || "Sin nombre"}</p>
                      <p className="text-zinc-500">{req.contact?.email || "-"}</p>
                      <p className="text-zinc-500">{req.contact?.phone || "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="font-semibold text-zinc-700">Productos solicitados ({req.selection?.length || 0})</p>
                      <ul className="mt-1 space-y-1 text-zinc-600">
                        {(req.selection || []).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900">{item.quantity}x</span>
                            <span>{item.title || item.productId}</span>
                            {item.variantId && <span className="text-zinc-400">({item.variantId})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {req.reasons?.length > 0 && (
                    <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span className="font-bold">Motivos: </span>
                      {req.reasons.join(", ")}
                    </div>
                  )}
                  {req.reviewNotes && (
                    <p className="text-xs text-zinc-500 italic">
                      Nota de revisión: {req.reviewNotes}
                    </p>
                  )}
                  {req.status === "pending_confirmation" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleReviewRequest(req, "confirmed")}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirmar solicitud</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewRequest(req, "rejected")}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 1: SOLICITUDES PENDIENTES */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {filteredPending.length === 0 ? (
            <div className={`${adminCard} py-12 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900">
                {filterSearch ? "No hay solicitudes con ese filtro" : "¡Al día! No hay solicitudes pendientes"}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {filterSearch ? "Probá buscando con otro término." : "Las nuevas postulaciones mayoristas aparecerán acá para su revisión."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPending.map((p) => {
                const cleanPhone = p.phone ? p.phone.replace(/[^0-9]/g, "") : "";
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone.startsWith("54") ? cleanPhone : `549${cleanPhone}`}?text=${encodeURIComponent(
                      `Hola ${p.fullName || p.businessName}! Nos comunicamos desde MYA Importaciones sobre tu solicitud de cuenta mayorista.`
                    )}`
                  : null;

                const requestedDate = p.wholesaleRequestedAt
                  ? new Date(p.wholesaleRequestedAt).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Fecha desconocida";

                return (
                  <article
                    key={p.id}
                    className={`${adminCard} border-l-4 border-l-amber-400 flex flex-col justify-between gap-4`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-zinc-950">
                            {p.businessName || p.fullName || "Sin nombre comercial"}
                          </h3>
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            Pendiente
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Contacto: <strong className="text-zinc-700">{p.fullName || "Sin titular"}</strong> · {p.email}
                        </p>
                      </div>

                      <span className="text-xs text-zinc-400">Postulado el {requestedDate}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                      <div>
                        <span className="text-zinc-500 block">Razón Social / Negocio</span>
                        <strong className="text-zinc-900">{p.businessName || "-"}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">CUIT / CUIL / DNI</span>
                        <strong className="text-zinc-900">{p.cuit || "-"}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Teléfono / WhatsApp</span>
                        <strong className="text-zinc-900">{p.phone || "-"}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Rubro / Notas</span>
                        <strong className="text-zinc-900 truncate block" title={p.wholesaleNotes || ""}>
                          {p.wholesaleNotes || "-"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                      <div className="flex items-center gap-2">
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>Contactar por WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(p)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Rechazar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(p)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Aprobar como Mayorista</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: MAYORISTAS APROBADOS */}
      {activeTab === "approved" && (
        <div className="space-y-4">
          {filteredApproved.length === 0 ? (
            <div className={`${adminCard} py-12 text-center`}>
              <h3 className="text-base font-bold text-zinc-900">
                {filterSearch ? "No hay mayoristas con ese filtro" : "Aún no hay clientes mayoristas aprobados"}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {filterSearch ? "Probá con otro término." : "Aprobá solicitudes pendientes o habilitá por email arriba."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredApproved.map((p) => {
                const cleanPhone = p.phone ? p.phone.replace(/[^0-9]/g, "") : "";
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone.startsWith("54") ? cleanPhone : `549${cleanPhone}`}?text=${encodeURIComponent(
                      `Hola ${p.fullName || p.businessName}! Nos comunicamos desde MYA Importaciones.`
                    )}`
                  : null;

                return (
                  <article
                    key={p.id}
                    className={`${adminCard} flex flex-wrap items-center justify-between gap-4`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-950 text-base">
                          {p.businessName || p.fullName || "Cliente Mayorista"}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          ★ Mayorista Activo
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>Contacto: {p.fullName || "-"}</span>
                        <span>Email: <strong className="text-zinc-700">{p.email}</strong></span>
                        {p.cuit && <span>CUIT: {p.cuit}</span>}
                        {p.phone && <span>Tel: {p.phone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRevoke(p)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition disabled:opacity-50"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Revocar</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: MONITOR DE MÁRGENES MAYORISTAS & ALERTAS */}
      {activeTab === "margins" && (
        <div className="space-y-4">
          {/* Subfiltros de margen */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-100 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setMarginFilter("low")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                marginFilter === "low"
                  ? "bg-amber-500 text-zinc-950 shadow-xs"
                  : "text-zinc-700 hover:bg-white/60"
              }`}
            >
              <AlertCircle className="size-3.5" />
              <span>En Alerta (&lt; 25%): {lowMarginCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setMarginFilter("critical")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                marginFilter === "critical"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-zinc-700 hover:bg-white/60"
              }`}
            >
              <TrendingDown className="size-3.5" />
              <span>Críticos (&lt; 15%): {criticalMarginCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setMarginFilter("healthy")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                marginFilter === "healthy"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-700 hover:bg-white/60"
              }`}
            >
              <TrendingUp className="size-3.5" />
              <span>Saludables (≥ 25%): {marginsList.length - lowMarginCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setMarginFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                marginFilter === "all"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-700 hover:bg-white/60"
              }`}
            >
              <span>Todos los productos: {marginsList.length}</span>
            </button>
          </div>

          {filteredMargins.length === 0 ? (
            <div className={`${adminCard} py-12 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900">
                {marginFilter === "critical"
                  ? "¡Excelente! No hay productos con margen crítico (< 15%)"
                  : marginFilter === "low"
                  ? "¡Excelente! No hay productos con margen bajo (< 25%)"
                  : "No se encontraron productos con estos filtros"}
              </h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMargins.map((item) => {
                const isCritical = item.marginPct < 15;
                const isLow = item.marginPct < 25;
                const badgeColor = isCritical
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : isLow
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200";

                const editedPrice = customPriceEdits[item.id] ?? item.wholesalePrice;

                return (
                  <article
                    key={item.id}
                    className={`${adminCard} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 ${
                      isCritical ? "border-l-rose-600" : isLow ? "border-l-amber-500" : "border-l-emerald-500"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-950 text-sm sm:text-base">
                          {item.title}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-black ${badgeColor}`}>
                          Margen {item.marginPct}%
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
                        <span>Categoría: <strong>{item.categoryName}</strong></span>
                        <span>Costo puesto en Tandil: <strong>{formatCurrency(item.landedCost)}</strong></span>
                        <span>PVP Minorista: <strong>{formatCurrency(item.retailPrice)}</strong></span>
                        <span>Ganancia neta x un: <strong className={item.netProfit > 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(item.netProfit)}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100">
                      {/* Precio sugerido para 25% */}
                      {item.marginPct < 25 && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePrice(item.id, item.suggestedWholesalePrice)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 px-3 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50"
                          title="Ajusta automáticamente el precio mayorista para alcanzar el 25% de margen"
                        >
                          <Sparkles className="size-3.5" />
                          <span>Subir a 25% ({formatCurrency(item.suggestedWholesalePrice)})</span>
                        </button>
                      )}

                      {/* Ajuste manual */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editedPrice}
                          onChange={(e) => setCustomPriceEdits((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          className="w-24 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdatePrice(item.id, editedPrice)}
                          disabled={isPending || editedPrice === item.wholesalePrice}
                          className="inline-flex items-center gap-1 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-30"
                        >
                          <Save className="size-3" />
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
