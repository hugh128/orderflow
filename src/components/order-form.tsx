"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useCreateOrder } from "@/hooks/use-create-order";
import { ApiError } from "@/lib/api/client";
import { createOrderSchema } from "@/lib/schemas/order";

const fields = [
  { name: "number", label: "Número de pedido", placeholder: "Ej. A-1042" },
  { name: "customer", label: "Cliente", placeholder: "Ej. Textiles Sol" },
  { name: "units", label: "Cantidad de unidades", placeholder: "Ej. 250" },
] as const;
type FieldName = (typeof fields)[number]["name"];
type FieldErrors = Partial<Record<FieldName, string[]>>;

function validateOrder({ value }: { value: Record<FieldName, string> }) {
  const result = createOrderSchema.safeParse(value);
  if (result.success) return undefined;
  const errors: Partial<Record<FieldName, string>> = {};
  for (const issue of result.error.issues) {
    const field = fields.find(({ name }) => name === issue.path[0]);
    if (field) errors[field.name] = issue.message;
  }
  return { fields: errors };
}

export function OrderForm() {
  const mutation = useCreateOrder();
  const submitting = useRef(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const form = useForm({
    defaultValues: { number: "", customer: "", units: "" },
    validators: { onChange: validateOrder, onSubmit: validateOrder },
    onSubmit: async ({ value, formApi }) => {
      if (submitting.current) return;
      submitting.current = true;
      setServerErrors({});
      setMessage("");
      setSuccess(false);
      try {
        await mutation.mutateAsync(createOrderSchema.parse(value));
        formApi.reset();
        setSuccess(true);
        setMessage("Pedido creado correctamente");
      } catch (error) {
        if (error instanceof ApiError && error.code === "DUPLICATE_ORDER_NUMBER") {
          setServerErrors({ number: [error.message] });
        } else if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
          const errors: FieldErrors = {};
          const fieldErrors = error.details?.fieldErrors;
          if (typeof fieldErrors === "object" && fieldErrors !== null) {
            for (const { name } of fields) {
              const messages = (fieldErrors as Record<string, unknown>)[name];
              if (Array.isArray(messages) && messages.every((item) => typeof item === "string")) errors[name] = messages;
            }
          }
          setServerErrors(errors);
          if (Object.keys(errors).length === 0) setMessage(error.message);
        } else {
          setMessage(error instanceof ApiError ? error.message : "No se pudo guardar el pedido. Inténtalo de nuevo.");
        }
      } finally { submitting.current = false; }
    },
  });

  return (
    <section className="panel" aria-labelledby="create-title">
      <div className="panel-heading">
        <p className="eyebrow">Registro</p>
        <h2 id="create-title">Nuevo pedido</h2>
        <p className="muted">Los paquetes se generan automáticamente, hasta 100 unidades por paquete.</p>
      </div>
      <form aria-label="Crear pedido" noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!submitting.current) void form.handleSubmit();
      }}>
        <div className="form-fields">
          {fields.map(({ name, label, placeholder }) => (
            <form.Field key={name} name={name}>
              {(field) => {
                const localErrors = field.state.meta.errors.filter(Boolean);
                const errors = [...new Set([...(serverErrors[name] ?? []), ...localErrors])];
                const errorId = `order-${name}-error`;
                return (
                  <div className="field">
                    <label htmlFor={`order-${name}`}>{label}</label>
                    <input id={`order-${name}`} name={name} type="text" inputMode={name === "units" ? "numeric" : "text"}
                      placeholder={placeholder} value={field.state.value} disabled={mutation.isPending}
                      aria-invalid={errors.length > 0} aria-describedby={errors.length ? errorId : undefined}
                      onBlur={field.handleBlur} onChange={(event) => {
                        field.handleChange(event.target.value);
                        setServerErrors((previous) => ({ ...previous, [name]: undefined }));
                        setMessage("");
                      }} />
                    {errors.length > 0 && <p className="field-error" id={errorId}>{errors.join(". ")}</p>}
                  </div>
                );
              }}
            </form.Field>
          ))}
        </div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => <button className="button primary" type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending ? "Guardando…" : "Guardar pedido"}
          </button>}
        </form.Subscribe>
        {message && <p className={success ? "success-message" : "field-error"} role={success ? "status" : "alert"}>{message}</p>}
      </form>
    </section>
  );
}
