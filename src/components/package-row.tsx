"use client";

import { useRef, useState } from "react";
import { useTransition } from "@/hooks/use-transition";
import { ApiError } from "@/lib/api/client";
import { nextStatus } from "@/lib/domain/package-status";
import { STATUS_LABELS } from "@/lib/status-labels";
import type { PackageDTO } from "@/lib/dto";
import { StatusBadge } from "./status-badge";

export function PackageRow({ pkg }: { pkg: PackageDTO }) {
  const mutation = useTransition();
  const locked = useRef(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [synchronizing, setSynchronizing] = useState(false);
  const to = nextStatus(pkg.status);
  const pending = mutation.isPending || synchronizing;

  async function transition(kind: "advance" | "reject") {
    if (locked.current) return;
    locked.current = true;
    setMessage("");
    setFailed(false);
    try {
      const result = await mutation.mutateAsync({ id: pkg.id, expectedStatus: pkg.status, kind });
      setMessage(`Paquete ${pkg.sequence} pasó a ${STATUS_LABELS[result.package.status]}`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof ApiError && error.code === "STATUS_CONFLICT"
        ? "El paquete ya había cambiado de estado; se actualizó la vista"
        : error instanceof ApiError ? error.message : "No se pudo actualizar el paquete. Inténtalo de nuevo.");
    } finally { locked.current = false; }
  }

  async function synchronize() {
    if (locked.current) return;
    locked.current = true;
    setSynchronizing(true);
    try { await mutation.synchronize(); }
    finally { locked.current = false; setSynchronizing(false); }
  }

  return <li className="package-row">
    <span className="package-sequence">Paquete {pkg.sequence}</span>
    <span className="muted">{pkg.units} unidades</span>
    <StatusBadge status={pkg.status} />
    <div className="package-actions">
      {to !== null && <button className="button" type="button" disabled={pending}
        aria-label={`Avanzar paquete ${pkg.sequence} a ${STATUS_LABELS[to]}`} onClick={() => void transition("advance")}>Avanzar</button>}
      {pkg.status === "review" && <button className="button" type="button" disabled={pending}
        aria-label={`Rechazar paquete ${pkg.sequence} a En proceso`} onClick={() => void transition("reject")}>Rechazar</button>}
      {pkg.status === "done" && <span className="completed">Completado</span>}
    </div>
    <div className="package-feedback">
      <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
      {failed && <button className="button" type="button" disabled={pending} onClick={() => void synchronize()}
        aria-label={`Reintentar sincronización del paquete ${pkg.sequence}`}>Reintentar sincronización</button>}
    </div>
  </li>;
}
