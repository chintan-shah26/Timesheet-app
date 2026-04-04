import { useState } from 'react';
import { useAuth } from '../App';
import client from '../api/client';

export default function Login() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await client.post('/api/auth/login', { email, password });
      setUser(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📋</div>
          <h1>TimeSheet</h1>
          <p>Track weekly attendance and billing</p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
            Sign in to your account
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="text"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                autoFocus
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            {error && <p className="alert-error" style={{ marginBottom: 12 }}>{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
