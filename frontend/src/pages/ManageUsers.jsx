import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../App';

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'worker' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    client.get('/api/admin/users').then(r => setUsers(r.data));
  }, []);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function createUser(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const r = await client.post('/api/admin/users', form);
      setUsers(u => [...u, r.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ email: '', name: '', password: '', role: 'worker' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user, role) {
    await client.patch(`/api/admin/users/${user.id}/role`, { role });
    setUsers(us => us.map(u => u.id === user.id ? { ...u, role } : u));
  }

  async function resetPassword(e) {
    e.preventDefault();
    await client.patch(`/api/admin/users/${resetTarget.id}/password`, { password: newPassword });
    setResetTarget(null); setNewPassword('');
  }

  async function deleteUser() {
    setDeleting(true);
    try {
      await client.delete(`/api/admin/users/${deleteTarget.id}`);
      setUsers(us => us.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">Add, edit, and remove team members</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ New User'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Create user account</h2>
          <form onSubmit={createUser}>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" placeholder="Jane Smith" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" placeholder="jane@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="min. 8 chars" value={form.password} onChange={set('password')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={set('role')}>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="alert-error" style={{ marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </div>
      )}

      <div className="card card-overflow">
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>No users yet</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="td-strong">{u.name}</td>
                  <td className="td-muted">{u.email}</td>
                  <td>
                    {u.id === currentUser?.id ? (
                      <span className="badge badge-draft" style={{ textTransform: 'capitalize' }}>{u.role} (you)</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => changeRole(u, e.target.value)}
                        className="form-select"
                        style={{ width: 'auto' }}
                      >
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setResetTarget(u); setNewPassword(''); }}>
                        Reset password
                      </button>
                      {u.id !== currentUser?.id && (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Delete {deleteTarget.name}?</h2>
            <p>This will permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) and all their timesheet data. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={deleteUser} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete user'}
              </button>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reset password — {resetTarget.name}</h2>
            <form onSubmit={resetPassword}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">New password</label>
                <input
                  type="password"
                  placeholder="min. 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">Save new password</button>
                <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
