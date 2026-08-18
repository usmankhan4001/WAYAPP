import * as SecureStore from 'expo-secure-store';

const DEFAULT_SERVER_URL = 'https://app.wayapp.io'; // Or user-configured server URL

export async function getServerUrl(): Promise<string> {
  const custom = await SecureStore.getItemAsync('wayapp_server_url');
  return custom || DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync('wayapp_server_url', url.replace(/\/$/, ''));
}

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('wayapp_auth_token');
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('wayapp_auth_token', token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync('wayapp_auth_token');
}

/**
 * Universal mobile API fetch wrapper with automatic JWT token injection
 */
export async function mobileApiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const serverUrl = await getServerUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${serverUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
