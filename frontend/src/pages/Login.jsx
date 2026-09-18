import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isAuthenticated, signIn } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Once signed in, send the user where they were trying to go (or the overview).
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(form); // the redirect above happens automatically
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card card" onSubmit={submit}>
        <div className="brand"><span className="brand-mark"><Leaf size={16} strokeWidth={1.8} /></span><span>SOFT-AGRI</span></div>
        <h1>Sign in</h1>
        <p className="text-muted">Monitor your farm from one calm dashboard.</p>

        <label className="field">
          <span>Username</span>
          <input name="username" value={form.username} onChange={update} autoComplete="username" autoFocus required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" value={form.password} onChange={update} autoComplete="current-password" required />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button primary" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        {config.useMock && <p className="text-muted text-sm">Demo mode is on. Any username and password will work.</p>}
      </form>
    </div>
  );
}
