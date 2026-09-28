import type {
  ApiHealth,
  FinanceSnapshotEnvelope,
  SaveFinanceSnapshotRequest,
  SaveFinanceSnapshotResult,
} from "@picket/domain";

export interface PicketApiClientOptions {
  fetch?: typeof globalThis.fetch;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PicketApiClient {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly baseUrl: string;

  constructor(baseUrl: string, options: PicketApiClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  health(signal?: AbortSignal): Promise<ApiHealth> {
    return this.request<ApiHealth>("/health", { signal });
  }

  loadFinanceSnapshot(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<SaveFinanceSnapshotResult> {
    return this.request<SaveFinanceSnapshotResult>("/v1/finance/snapshot", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  saveFinanceSnapshot(
    accessToken: string,
    request: SaveFinanceSnapshotRequest,
    signal?: AbortSignal,
  ): Promise<FinanceSnapshotEnvelope> {
    return this.request<FinanceSnapshotEnvelope>("/v1/finance/snapshot", {
      method: "PUT",
      headers: {
        ...this.authHeaders(accessToken),
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });
  }

  private authHeaders(accessToken: string): HeadersInit {
    if (!accessToken.trim()) throw new ApiError("Missing access token", 401);
    return { authorization: `Bearer ${accessToken}` };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ApiError("Không thể kết nối đến Picket API", 0, error);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String(body.error)
          : `Picket API trả về lỗi ${response.status}`;
      throw new ApiError(message, response.status, body);
    }

    return body as T;
  }
}
