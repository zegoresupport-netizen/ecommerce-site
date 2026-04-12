const AUTH_TOKEN_KEY = 'admin-auth-token';

export const getAuthToken = (): string => {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const hasAuthToken = () => {
  return Boolean(getAuthToken());
};
