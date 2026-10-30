"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { OrderDTO } from "@/lib/dto";
import type { OrderHistorySummary } from "@/lib/ai/history-types";
import { orderKeys } from "@/hooks/keys";
import { STATUS_LABELS } from "@/lib/status-labels";

export function AiOrderSummary({ active }: { active: boolean }) {
  const [id, setId] = useState("");
  const locked = useRef(false);
  const orders = useQuery({
    queryKey: orderKeys.all,
    enabled: active,
    retry: false,
    queryFn: ({ signal }) => apiFetch<OrderDTO[]>("/api/orders", { signal }),
  });
  const summary = useMutation({
    retry: false,
    mutationFn: (orderId: string) =>
      apiFetch<OrderHistorySummary>(`/api/orders/${orderId}/summary`, {
        method: "POST",
      }),
  });
  async function generate() {
    if (!id || locked.current) return;
    locked.current = true;
    try {
      await summary.mutateAsync(id);
    } catch {
      /* El error se presenta debajo. */
    } finally {
      locked.current = false;
    }
  }
  return (
    <div className="ai-summary" aria-busy={summary.isPending}>
      <div className="field">
        <label htmlFor="summary-order">Pedido a resumir</label>
        <select
          id="summary-order"
          value={id}
          disabled={summary.isPending}
          onChange={(event) => {
            setId(event.target.value);
            summary.reset();
          }}
        >
          <option value="">Selecciona un pedido</option>
          {orders.data?.map((order) => (
            <option key={order.id} value={order.id}>
              {order.number} · {order.customer}
            </option>
          ))}
        </select>
      </div>
      {orders.isPending && <p className="muted">Cargando pedidos…</p>}
      {orders.isError && (
        <p className="field-error">
          No se pudieron cargar los pedidos.{" "}
          <button className="button" onClick={() => void orders.refetch()}>
            Reintentar pedidos
          </button>
        </p>
      )}
      {orders.data?.length === 0 && (
        <p className="muted">Crea un pedido para poder resumirlo.</p>
      )}
      <button
        className="button primary"
        type="button"
        disabled={!id || summary.isPending}
        onClick={() => void generate()}
      >
        {summary.isPending ? "Generando resumen…" : "Generar resumen"}
      </button>
      <div aria-live="polite" aria-atomic="true">
        {summary.error && (
          <p className="field-error">{summary.error.message}</p>
        )}
        {summary.data && (
          <section
            className="assistant-proposal"
            aria-label="Resumen del pedido"
          >
            <h3>Pedido {summary.data.orderNumber}</h3>
            <p>{summary.data.overview}</p>
            <p className="muted">
              Consultado:{" "}
              <time dateTime={summary.data.observedAt}>
                {new Date(summary.data.observedAt).toLocaleString("es")}
              </time>
            </p>
            <h4>Movimientos destacados</h4>
            <ol className="history-timeline">
              {summary.data.highlights.map((event) => (
                <li key={event.id}>
                  <strong>
                    Paquete {event.sequence}: {STATUS_LABELS[event.fromStatus]}{" "}
                    → {STATUS_LABELS[event.toStatus]}
                  </strong>
                  <p className="muted">
                    <time dateTime={event.createdAt}>
                      {new Date(event.createdAt).toLocaleString("es")}
                    </time>
                  </p>
                  {event.reason && <p>{event.reason}</p>}
                </li>
              ))}
            </ol>
            <p className="muted">{summary.data.scope}</p>
            <p className="muted">
              Puede haber cambios posteriores. Vuelve a generar el resumen para
              actualizarlo.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
