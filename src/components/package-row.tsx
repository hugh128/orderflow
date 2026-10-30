"use client";

import { useEffect, useRef, useState } from "react";
import { useTransition } from "@/hooks/use-transition";
import { ApiError } from "@/lib/api/client";
import { nextStatus } from "@/lib/domain/package-status";
import { STATUS_LABELS } from "@/lib/status-labels";
import type { PackageDTO } from "@/lib/dto";
import { StatusBadge } from "./status-badge";
import { rejectionReasonSchema } from "@/lib/schemas/rejection";

export function PackageRow({ pkg }: { pkg: PackageDTO }) {
  const mutation = useTransition();
  const locked = useRef(false);
  const row = useRef<HTMLLIElement>(null);
  const restoreFocus = useRef(false);
  const originStatus = useRef(pkg.status);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [synchronizing, setSynchronizing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (rejecting) reasonInput.current?.focus(); }, [rejecting]);
  const to = nextStatus(pkg.status);
  const pending = mutation.isPending || synchronizing;

  useEffect(() => {
    if (pending || !restoreFocus.current) return;
    if (document.activeElement !== document.body && !row.current?.contains(document.activeElement)) {
      restoreFocus.current = false;
      return;
    }
    const control = row.current?.querySelector<HTMLButtonElement>(".package-actions button:not(:disabled)");
    (control ?? row.current)?.focus();
    // El observador puede renderizar el nuevo DTO después de resolver la mutación.
    if (pkg.status !== originStatus.current) restoreFocus.current = false;
  }, [pending, pkg.status]);

  async function transition(kind: "advance" | "reject", validatedReason?: string) {
    if (locked.current) return;
    restoreFocus.current = Boolean(row.current?.contains(document.activeElement));
    originStatus.current = pkg.status;
    locked.current = true;
    setMessage("");
    setFailed(false);
    try {
      const result = await mutation.mutateAsync({ id: pkg.id, expectedStatus: pkg.status, kind, reason: validatedReason });
      setRejecting(false);
      setReason("");
      const stale = mutation.hasSynchronizationError();
      setFailed(stale);
      setMessage(`Paquete ${pkg.sequence} pasó a ${STATUS_LABELS[result.package.status]}${stale ? ". No se pudo actualizar la vista; reintenta la sincronización" : ""}`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof ApiError && error.code === "STATUS_CONFLICT"
        ? mutation.hasSynchronizationError()
          ? "El paquete ya había cambiado de estado. No se pudo actualizar la vista; reintenta la sincronización"
          : "El paquete ya había cambiado de estado; se actualizó la vista"
        : error instanceof ApiError ? error.message : "No se pudo actualizar el paquete. Inténtalo de nuevo.");
    } finally { locked.current = false; }
  }

  async function synchronize() {
    if (locked.current) return;
    restoreFocus.current = Boolean(row.current?.contains(document.activeElement));
    originStatus.current = pkg.status;
    locked.current = true;
    setSynchronizing(true);
    try {
      await mutation.synchronize();
      const stale = mutation.hasSynchronizationError();
      setFailed(stale);
      setMessage(stale ? "No se pudo actualizar la vista. Revisa tu conexión y reintenta." : "Vista actualizada");
    }
    finally { locked.current = false; setSynchronizing(false); }
  }

  return <li className="package-row" ref={row} tabIndex={-1} aria-label={`Paquete ${pkg.sequence}, ${STATUS_LABELS[pkg.status]}`}>
    <span className="package-sequence">Paquete {pkg.sequence}</span>
    <span className="muted">{pkg.units} unidades</span>
    <StatusBadge status={pkg.status} />
    <div className="package-actions">
      {to !== null && <button className="button" type="button" disabled={pending}
        aria-label={`Avanzar paquete ${pkg.sequence} a ${STATUS_LABELS[to]}`} onClick={() => void transition("advance")}>Avanzar</button>}
      {pkg.status === "review" && <button className="button" type="button" disabled={pending}
        aria-label={`Rechazar paquete ${pkg.sequence} a En proceso`} aria-expanded={rejecting} onClick={() => setRejecting(true)}>Rechazar</button>}
      {pkg.status === "done" && <span className="completed">Completado</span>}
    </div>
    {rejecting && pkg.status === "review" && <form className="rejection-form field" noValidate onSubmit={event => {
      event.preventDefault();
      const parsed = rejectionReasonSchema.safeParse(reason);
      if (!parsed.success) { setReasonError(parsed.error.issues[0].message); return; }
      setReasonError("");
      void transition("reject", parsed.data);
    }}>
      <label htmlFor={`reason-${pkg.id}`}>Motivo del rechazo del paquete {pkg.sequence}</label>
      <textarea ref={reasonInput} id={`reason-${pkg.id}`} value={reason} maxLength={300} disabled={pending}
        aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? `reason-error-${pkg.id}` : undefined}
        onChange={event => { setReason(event.target.value); setReasonError(""); }} />
      {reasonError && <p className="field-error" id={`reason-error-${pkg.id}`}>{reasonError}</p>}
      <div className="package-actions"><button className="button" type="submit" disabled={pending} aria-label={`Confirmar rechazo del paquete ${pkg.sequence}`}>Confirmar rechazo</button>
        <button className="button" type="button" disabled={pending} onClick={() => { setRejecting(false); row.current?.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus(); }}>Cancelar</button></div>
    </form>}
    <div className="package-feedback">
      <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
      {failed && <button className="button" type="button" disabled={pending} onClick={() => void synchronize()}
        aria-label={`Reintentar sincronización del paquete ${pkg.sequence}`}>Reintentar sincronización</button>}
    </div>
  </li>;
}
