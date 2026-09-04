import { HttpError } from '../middleware/error.js';

/**
 * Gateway-side fan-out to the internal services. The SPA never talks to
 * Analytics or Inventory directly - it only knows the gateway origin.
 */
export async function forward(baseUrl, path, { method = 'GET', body, headers = {}, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new HttpError(response.status, payload?.detail || payload?.message || 'upstream error', payload);
    return payload;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err.name === 'AbortError') throw new HttpError(504, `upstream timeout: ${baseUrl}${path}`);
    throw new HttpError(502, `upstream unreachable: ${baseUrl}${path}`);
  } finally {
    clearTimeout(timer);
  }
}
