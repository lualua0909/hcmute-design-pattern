const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// The token getter is injected by AuthProvider so this module stays dependency-free.
let tokenProvider = async () => null;
export const setTokenProvider = (fn) => { tokenProvider = fn; };

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.message || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

const qs = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const api = {
  health: () => request('/health', { auth: false }),

  products: {
    list: (params) => request(`/api/products${qs(params)}`),
    get: (idOrSlug) => request(`/api/products/${idOrSlug}`),
    create: (data) => request('/api/products', { method: 'POST', body: data }),
    update: (id, data) => request(`/api/products/${id}`, { method: 'PUT', body: data }),
    remove: (id, hard = false) => request(`/api/products/${id}${qs({ hard: hard || undefined })}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request('/api/categories', { auth: false }),
    create: (data) => request('/api/categories', { method: 'POST', body: data }),
    update: (id, data) => request(`/api/categories/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: () => request('/api/orders'),
    get: (id) => request(`/api/orders/${id}`),
    create: (items, note) => request('/api/orders', { method: 'POST', body: { items, note } }),
    cancel: (id) => request(`/api/orders/${id}/cancel`, { method: 'POST' }),
    retry: (id) => request(`/api/orders/${id}/retry`, { method: 'POST' }),
  },

  users: {
    me: () => request('/api/users/me'),
    list: () => request('/api/users'),
    setRole: (id, role) => request(`/api/users/${id}/role`, { method: 'PUT', body: { role } }),
    saveFcmToken: (token) => request('/api/users/me/fcm-token', { method: 'PUT', body: { token } }),
  },

  analytics: {
    overview: (days = 30) => request(`/api/analytics/overview${qs({ days })}`),
    revenue: (days = 30) => request(`/api/analytics/revenue${qs({ days })}`),
    topProducts: (limit = 8, days = 30) => request(`/api/analytics/top-products${qs({ limit, days })}`),
    rarityMix: (days = 30) => request(`/api/analytics/rarity-mix${qs({ days })}`),
  },

  inventory: {
    stock: (productId) => request(`/api/inventory/stock/${productId}`, { auth: false }),
    list: () => request('/api/inventory/stock'),
    restock: (data) => request('/api/inventory/restock', { method: 'POST', body: data }),
    movements: (limit = 50) => request(`/api/inventory/movements${qs({ limit })}`),
  },

  notifications: {
    list: () => request('/api/notifications'),
    readAll: () => request('/api/notifications/read-all', { method: 'POST' }),
  },
};
