import { fetch as nativeFetch } from "@tauri-apps/plugin-http";

export const REQUEST_TIMEOUT_MS = 15_000;

/** Bound both connection and body reading so an unavailable provider cannot leave the UI loading forever. */
export async function fetch(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = async () => {
    const response = await nativeFetch(input, { ...init, signal: controller.signal, connectTimeout: REQUEST_TIMEOUT_MS });
    const body = await response.arrayBuffer();
    return new Response([101, 103, 204, 205, 304].includes(response.status) ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
  try {
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Translation request timed out"));
        }, REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
