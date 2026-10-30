"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { PackageEventDTO } from "@/lib/dto";
import { orderKeys } from "@/hooks/keys";
import { STATUS_LABELS } from "@/lib/status-labels";

export function PackageHistory({id,sequence}: {id: string; sequence: number}) {
  const [expanded,setExpanded]=useState(false);
  const query=useQuery({queryKey:[...orderKeys.all,"history",id], enabled:expanded,
    queryFn:({signal})=>apiFetch<PackageEventDTO[]>(`/api/packages/${id}/history`,{signal}),retry:false});
  return <div className="package-history">
    <button className="button" type="button" aria-expanded={expanded} aria-controls={`history-${id}`}
      aria-label={`${expanded?"Ocultar":"Ver"} historial del paquete ${sequence}`} onClick={()=>setExpanded(!expanded)}>Historial</button>
    {expanded && <section id={`history-${id}`} aria-label={`Historial del paquete ${sequence}`} aria-busy={query.isFetching}>
      <p className="muted">Últimos 50 movimientos. Solo se registran cambios desde que se habilitó el historial.</p>
      {query.isPending && <p>Cargando historial…</p>}
      {query.isError && <div role="alert"><p className="field-error">No se pudo cargar el historial.</p><button className="button" onClick={()=>void query.refetch()}>Reintentar historial</button></div>}
      {query.data?.length===0 && <p>Aún no hay movimientos registrados</p>}
      {query.data && <ol className="history-timeline">{query.data.map(event=><li key={event.id}>
        <p><strong>{STATUS_LABELS[event.fromStatus]} → {STATUS_LABELS[event.toStatus]}</strong></p>
        <time className="muted" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("es")}</time>
        {event.reason && <p>{event.reason}</p>}
      </li>)}</ol>}
    </section>}
  </div>;
}
