"use client";

import { useState } from "react";
import { useOrder } from "@/hooks/use-order";
import type { OrderDTO } from "@/lib/dto";
import { PackageRow } from "./package-row";
import { ProgressBar } from "./progress-bar";
import { StatusCounts } from "./status-counts";

export function OrderCard({ order }: { order: OrderDTO }) {
  const [expanded, setExpanded] = useState(false);
  const detail = useOrder(order.id, expanded);
  const detailsId = `packages-${order.id}`;
  return (
    <article className="order-card" aria-labelledby={`title-${order.id}`}>
      <div className="order-heading">
        <div><h3 id={`title-${order.id}`}>{order.number}</h3><p className="order-customer">{order.customer}</p></div>
        <div className="order-meta"><strong>{order.totalUnits.toLocaleString("es")} <span>unidades</span></strong>
          <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}</time>
        </div>
      </div>
      <ProgressBar percent={order.summary.percent} label={`Avance del pedido ${order.number}`} />
      <StatusCounts counts={order.summary.counts} />
      <button type="button" className="expand-button" aria-expanded={expanded} aria-controls={detailsId}
        aria-label={`${expanded ? "Ocultar" : "Ver"} paquetes de ${order.number}`} onClick={() => setExpanded((value) => !value)}>
        <span>{expanded ? "Ocultar paquetes" : "Ver paquetes"}<span className="package-total">{order.summary.totalPackages}</span></span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div id={detailsId} className="order-detail" role="region" aria-label={`Paquetes del pedido ${order.number}`} aria-busy={detail.isFetching}>
        {detail.isPending && <p className="muted">Cargando paquetes…</p>}
        {detail.isError && <div role="alert" className="query-error"><p>{detail.error.message}</p>
          <button className="button" onClick={() => void detail.refetch()}>Reintentar detalle</button></div>}
        {detail.data && <ul className="package-list">{detail.data.packages.map((pkg) => <PackageRow key={pkg.id} pkg={pkg} />)}</ul>}
      </div>}
    </article>
  );
}
