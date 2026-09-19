import { config } from '../config';
import { http } from './http';

const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Real mode: Django REST Framework SimpleJWT -> POST /api/auth/token/
// Mock mode: any non-empty username and password signs in.
export async function login({ username, password }) {
  if (config.useMock) {
    await wait();
    if (!username || !password) throw new Error('Enter your username and password.');
    return { access: 'mock-access-token', refresh: 'mock-refresh-token', user: { name: username } };
  }
  const tokens = await http('/auth/token/', { method: 'POST', body: { username, password } });
  return { ...tokens, user: { name: username } };
}
