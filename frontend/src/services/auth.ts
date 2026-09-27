import type { AuthUser, LoginCredentials, AuthResponse, UserRole } from '../types';

/**
 * ⚠ DEMO CREDENTIALS — Strictly for project demonstration and development.
 * In production, this authentication layer delegates to the FastAPI OAuth2/JWT endpoint.
 */
export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; user: AuthUser }> = {
  'Admin': {
    email: 'admin@terrax.gov.in',
    pass: 'Admin@123',
    user: {
      id: 'USR-ADM-001',
      email: 'admin@terrax.gov.in',
      name: 'Shri. Rajesh Sharma, IAS',
      role: 'Admin',
      department: 'Dept. of Land Resources (DoLR)',
      badgeNumber: 'DOLR-ADM-01',
      token: 'demo-jwt-token-admin-sih26011',
    },
  },
  'Surveyor': {
    email: 'surveyor@terrax.gov.in',
    pass: 'Surveyor@123',
    user: {
      id: 'USR-SRV-002',
      email: 'surveyor@terrax.gov.in',
      name: 'K. Anantharaman, Senior Surveyor',
      role: 'Surveyor',
      department: 'Tamil Nadu Cadastral Survey Division (Adyar Sector)',
      badgeNumber: 'TN-SRV-26011',
      token: 'demo-jwt-token-surveyor-sih26011',
    },
  },
  'Authority Viewer': {
    email: 'viewer@terrax.gov.in',
    pass: 'Viewer@123',
    user: {
      id: 'USR-AUT-003',
      email: 'viewer@terrax.gov.in',
      name: 'Dr. P. Meenakshi, Revenue Inspector',
      role: 'Authority Viewer',
      department: 'State Land Records & Registration Authority',
      badgeNumber: 'TN-REV-408',
      token: 'demo-jwt-token-viewer-sih26011',
    },
  },
};

const AUTH_STORAGE_KEY = 'terrax_auth_session';

/**
 * Persists authenticated session in localStorage (Remember Me) or sessionStorage (Session only).
 */
export function saveAuthSession(user: AuthUser, rememberMe: boolean): void {
  try {
    const data = JSON.stringify({ user, rememberMe, timestamp: Date.now() });
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, data);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, data);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (err) {
    console.error('[Auth] Failed to save session:', err);
  }
}

/**
 * Loads stored authentication session from localStorage or sessionStorage.
 */
export function loadAuthSession(): AuthUser | null {
  try {
    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed?.user) return parsed.user as AuthUser;
    }
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.user) return parsed.user as AuthUser;
    }
  } catch (err) {
    console.error('[Auth] Failed to load session:', err);
  }
  return null;
}

/**
 * Clears stored authentication session.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('[Auth] Failed to clear session:', err);
  }
}

/**
 * Login authentication abstraction.
 * Currently verifies against structured demo credentials with simulated network latency.
 * Future FastAPI integration:
 *   const res = await axios.post('/auth/login', { email, password, role });
 *   return res.data;
 */
export async function authenticate(credentials: LoginCredentials): Promise<AuthResponse> {
  const { email, password, role } = credentials;

  // Realistic network authentication delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  const trimmedEmail = email.trim().toLowerCase();
  const demoEntry = DEMO_CREDENTIALS[role];

  // Check role-specific credentials first
  if (demoEntry && demoEntry.email.toLowerCase() === trimmedEmail && demoEntry.pass === password) {
    return {
      success: true,
      user: { ...demoEntry.user },
      token: demoEntry.user.token,
    };
  }

  // Check if matching another valid role's credentials and adjust gracefully
  for (const r of Object.keys(DEMO_CREDENTIALS) as UserRole[]) {
    const match = DEMO_CREDENTIALS[r];
    if (match.email.toLowerCase() === trimmedEmail && match.pass === password) {
      return {
        success: true,
        user: { ...match.user },
        token: match.user.token,
      };
    }
  }

  return {
    success: false,
    error: 'Invalid government email or password for the selected role.',
  };
}
