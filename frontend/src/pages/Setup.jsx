import { useState } from 'react';
import { useAuth } from '../App';
import client from '../api/client';

export default function Setup() {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', name: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const r = await client.post('/api/auth/setup', {
        email: form.email, name: form.name, password: form.password,
      });
      setUser(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📋</div>
          <h1>First-time setup</h1>
          <p>Create the admin account to get started</p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
            Create admin account
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Full name</label>
              <input className="form-input" placeholder="Jane Smith" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Email</label>
              <input className="form-input" placeholder="admin@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="min. 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Confirm password</label>
              <input className="form-input" type="password" placeholder="repeat password" value={form.confirm} onChange={set('confirm')} required />
            </div>
            {error && <p className="alert-error" style={{ marginBottom: 12 }}>{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create admin account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
