export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (headers['Content-Type'] === 'multipart/form-data') {
    delete headers['Content-Type']; // let browser set it with boundary
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'API Error');
  }
  return response.json();
}

export const api = {
  get: (url: string) => fetchWithAuth(url),
  post: (url: string, body: any) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) }),
  postForm: (url: string, body: URLSearchParams) => fetchWithAuth(url, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  put: (url: string, body?: any) => fetchWithAuth(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};
