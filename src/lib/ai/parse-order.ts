import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { z } from "zod";
import { createOrderSchema } from "../schemas/order";
import { getCloudflareClient } from "./client";
import { AiUnavailableError } from "./errors";
import { ORDER_SYSTEM_PROMPT, orderUserMessage } from "./prompt";

export interface AiClient {
  chat: { completions: {
    create(input: ChatCompletionCreateParamsNonStreaming): Promise<unknown>;
  } };
}

type OrderField = "number" | "customer" | "units";
export type OrderDraft = Partial<z.output<typeof createOrderSchema>>;
export type ParseOrderResult = {
  draft: OrderDraft;
  issues: { field: OrderField; message: string }[];
};

const completionSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.literal("stop"),
    message: z.object({ content: z.string().min(1), refusal: z.null().optional() }),
  })).min(1),
});
const missingMessages: Record<OrderField, string> = {
  number: "No se detectó el número de pedido",
  customer: "No se detectó el cliente",
  units: "No se detectó la cantidad de unidades",
};

export async function parseOrderFromText(text: string, client?: AiClient): Promise<ParseOrderResult> {
  try {
    const model = process.env.CLOUDFLARE_MODEL?.trim();
    if (!model) throw new AiUnavailableError();
    const response = await (client ?? getCloudflareClient()).chat.completions.create({
      model, stream: false, max_tokens: 300, temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ORDER_SYSTEM_PROMPT },
        { role: "user", content: orderUserMessage(text) },
      ],
    });
    const completion = completionSchema.parse(response);
    const raw = z.record(z.string(), z.unknown()).parse(
      JSON.parse(completion.choices[0].message.content),
    );
    const issues: ParseOrderResult["issues"] = [];
    function field<T>(name: OrderField, schema: z.ZodType<T>): T | undefined {
      if (raw[name] === null || raw[name] === undefined) {
        issues.push({ field: name, message: missingMessages[name] });
        return undefined;
      }
      const result = schema.safeParse(raw[name]);
      if (result.success) return result.data;
      issues.push({ field: name, message: result.error.issues[0].message });
      return undefined;
    }
    const number = field("number", createOrderSchema.shape.number);
    const customer = field("customer", createOrderSchema.shape.customer);
    const units = field("units", createOrderSchema.shape.units);
    return {
      draft: {
        ...(number !== undefined && { number }),
        ...(customer !== undefined && { customer }),
        ...(units !== undefined && { units }),
      },
      issues,
    };
  } catch {
    // No adjuntar cause, ni registrar la respuesta, el texto o credenciales.
    throw new AiUnavailableError();
  }
}
