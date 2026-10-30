"use client";

import { useRef, useState } from "react";
import type { OrderDraft } from "@/lib/ai/parse-order";
import { AiOrderBox } from "./ai-order-box";

export function AiAssistant({ onDraft, disabled }: {
  onDraft: (draft: OrderDraft) => void | Promise<void>;
  disabled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return <>
    <button ref={launcher} type="button" className="assistant-launcher" aria-haspopup="dialog"
      aria-controls="order-assistant" aria-expanded={open} onClick={() => {
        dialog.current?.showModal();
        setOpen(true);
        dialog.current?.querySelector("textarea")?.focus();
      }}>
      <span className="assistant-spark" aria-hidden="true">✦</span>
      <span><strong>Asistente IA</strong><small aria-hidden="true">Te ayudo a preparar un pedido</small></span>
    </button>
    <dialog ref={dialog} id="order-assistant" className="assistant-dialog" aria-labelledby="assistant-title"
      aria-describedby="assistant-description" onClose={() => setOpen(false)}>
      <header className="assistant-heading">
        <div><p className="eyebrow">Orderflow · IA</p><h2 id="assistant-title">Asistente IA</h2></div>
        <button className="button assistant-close" type="button" aria-label="Cerrar asistente" onClick={() => {
          dialog.current?.close();
          launcher.current?.focus();
        }}><span aria-hidden="true">×</span></button>
      </header>
      <div className="assistant-body">
        <div className="assistant-intro"><span className="assistant-intro-icon" aria-hidden="true">✦</span>
          <h3>Prepara tu próximo pedido</h3>
          <p className="muted" id="assistant-description">Cuéntame el número, el cliente y la cantidad. Te propongo los datos para que los revises antes de guardar.</p>
        </div>
        <AiOrderBox disabled={disabled} onDraft={async (draft) => {
          dialog.current?.close();
          await onDraft(draft);
        }} />
        <p className="assistant-footnote">Solo preparo pedidos. No consulto ni modifico los que ya existen.</p>
      </div>
    </dialog>
  </>;
}
