import type { OrderDetails, OrderSummary } from "$lib/types/carrefour";
import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

type AuthStatus = {
  authenticated?: boolean;
  exists?: boolean;
  updatedAt?: string;
  statePath?: string;
};

const DEFAULT_MCP_SERVER_URL = "http://127.0.0.1:3000/mcp";
const MCP_PROTOCOL_VERSION = "2025-03-26";

export function getMcpServerUrl(): string {
  return (
    privateEnv.CARREFOUR_MCP_SERVER_URL ??
    publicEnv.PUBLIC_CARREFOUR_MCP_SERVER_URL ??
    DEFAULT_MCP_SERVER_URL
  );
}

function getMcpServerAuthHeader(): string | undefined {
  const user = privateEnv.CARREFOUR_MCP_BASIC_AUTH_USER;
  const password = privateEnv.CARREFOUR_MCP_BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return undefined;
  }

  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

type JsonRpcToolSuccess<T> = {
  result?: {
    structuredContent?: T;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
};

function parseSseMessages<T>(payload: string): JsonRpcToolSuccess<T>[] {
  return payload
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("event: message"))
    .map((chunk) => {
      const dataLine = chunk
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!dataLine) {
        throw new Error("Missing data payload in MCP SSE response");
      }

      return JSON.parse(dataLine.slice(6)) as JsonRpcToolSuccess<T>;
    });
}

function getToolResultText<T>(message: JsonRpcToolSuccess<T>): string {
  return (
    message.result?.content
      ?.map((item) => item.text)
      .filter((text): text is string => Boolean(text))
      .join("\n") ?? "Unknown MCP tool error"
  );
}

async function callMcpTool<T>(
  toolName: string,
  toolInput: Record<string, unknown> = {},
): Promise<T> {
  try {
    const response = await fetch(getMcpServerUrl(), {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
        ...(getMcpServerAuthHeader()
          ? { Authorization: getMcpServerAuthHeader() }
          : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolInput,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP call failed (${response.status}): ${errorText}`);
    }

    const responseText = await response.text();
    const messages = parseSseMessages<T>(responseText);
    const message = messages.at(-1);

    if (!message) {
      throw new Error("Empty MCP response");
    }

    if (message.error) {
      throw new Error(
        `MCP error ${message.error.code}: ${message.error.message}`,
      );
    }

    if (message.result?.isError) {
      throw new Error(getToolResultText(message));
    }

    if (message.result?.structuredContent === undefined) {
      throw new Error("Missing structured content in MCP response");
    }

    return message.result.structuredContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Carrefour MCP call failed: ${message}`);
  }
}

export function getAuthStatus(): Promise<AuthStatus> {
  return callMcpTool<AuthStatus>("auth_status");
}

export function logoutAuth(): Promise<{ success?: boolean }> {
  return callMcpTool<{ success?: boolean }>("auth_logout");
}

export function listRemoteOrders(
  limit?: number,
): Promise<{ count: number; orders: OrderSummary[] }> {
  const toolInput =
    typeof limit === "number" && Number.isFinite(limit) ? { limit } : {};

  return callMcpTool<{ count: number; orders: OrderSummary[] }>("list_orders", {
    ...toolInput,
  });
}

export function getRemoteOrderDetails(orderRef: string): Promise<OrderDetails> {
  return callMcpTool<OrderDetails>("get_order_details", {
    orderRef,
  });
}

export type CartItem = {
  name: string;
  productId?: string;
  productUrl: string;
  quantity?: number;
};

export type AddToCartResult = {
  added: number;
  failed: number;
  cartUrl: string;
  results: Array<{
    name: string;
    productUrl: string;
    success: boolean;
    message?: string;
  }>;
};

export function addToCart(items: CartItem[]): Promise<AddToCartResult> {
  return callMcpTool<AddToCartResult>("add_to_cart", { items });
}
