const API_BASE_URL = 'http://localhost:3000/api';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoanPurpose {
  id: number;
  code: string;
  name: string;
}

export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LoanApplication {
  id: string;
  fullName: string;
  nric?: string;
  phoneNumber?: string;
  email: string;
  monthlyIncome: string | number;
  loanAmount: string | number;
  tenureMonths: number;
  purposeId: number;
  purpose?: LoanPurpose;
  status: LoanStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export function getToken(): string | null {
  return localStorage.getItem('loan_portal_token');
}

export function saveSession(token: string, user: User): void {
  localStorage.setItem('loan_portal_token', token);
  localStorage.setItem('loan_portal_user', JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem('loan_portal_token');
  localStorage.removeItem('loan_portal_user');
}

export function getSavedUser(): User | null {
  const value = localStorage.getItem('loan_portal_user');

  if (!value) return null;

  try {
    return JSON.parse(value) as User;
  } catch {
    clearSession();
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;

    if (response.status === 401) {
      clearSession();
    }

    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const result = await apiRequest<{
    token?: string;
    accessToken?: string;
    user: User;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const token = result.accessToken ?? result.token;

  if (!token) {
    throw new Error('The login response did not contain a JWT token.');
  }

  saveSession(token, result.user);

  return { token, user: result.user };
}

export async function registerCustomer(data: {
  fullName: string;
  email: string;
  password: string;
}): Promise<void> {
  await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}