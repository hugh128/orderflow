"use client";

import { useRef, useState } from "react";
import { useParseOrder } from "@/hooks/use-parse-order";
import { ApiError } from "@/lib/api/client";
import type { OrderDraft, ParseOrderResult } from "@/lib/ai/parse-order";

export function AiOrderBox({ onDraft, disabled = false }: {
  onDraft: (draft: OrderDraft) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ParseOrderResult | null>(null);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const mutation = useParseOrder();

  async function analyze() {
    if (sending.current || disabled || !text.trim() || text.length > 500) return;
    sending.current = true;
    setPending(true);
    setResult(null);
    setError("");
    try {
      const proposal = await mutation.mutateAsync(text.trim());
      setResult(proposal);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "No se pudo analizar el pedido. Puedes completar el formulario manualmente.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return <div className="ai-order-box" aria-busy={pending}>
    <div className="field">
      <label htmlFor="ai-order-text">Describe el pedido con tus palabras (opcional)</label>
      <textarea id="ai-order-text" rows={3} maxLength={500} value={text}
        disabled={pending || disabled} aria-describedby="ai-order-help ai-order-count"
        placeholder="Pedido A-1042 para Textiles Sol, 250 unidades"
        onChange={(event) => { setText(event.target.value); setResult(null); setError(""); }} />
      <div className="ai-help"><p className="muted" id="ai-order-help">La IA propone los datos; tú los revisas y guardas.</p>
        <span className="muted" id="ai-order-count">{text.length}/500</span></div>
    </div>
    <button className="button" type="button" disabled={disabled || pending || !text.trim() || text.length > 500} onClick={() => void analyze()}>
      {pending ? "Analizando…" : "Analizar"}
    </button>
    <div className="ai-result" aria-live="polite" aria-atomic="true">
      {pending && <p className="muted">Analizando el pedido…</p>}
      {result && <div className="assistant-proposal"><h3>Tu propuesta de pedido</h3>
        <dl>{([
          ["number", "Número de pedido"], ["customer", "Cliente"], ["units", "Cantidad de unidades"],
        ] as const).map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{result.draft[field] ?? "Sin detectar"}</dd></div>)}</dl>
        <p className="muted">Revisa los datos antes de guardar</p>
        {result.issues.length > 0 && <ul className="ai-issues">{result.issues.map(({ field, message }) => <li key={field}>{message}</li>)}</ul>}
        <button type="button" className="button primary" disabled={disabled || Object.keys(result.draft).length === 0}
          onClick={() => void onDraft(result.draft)}>Usar estos datos</button>
      </div>}
      {error && <p className="field-error">{error}</p>}
    </div>
  </div>;
}
