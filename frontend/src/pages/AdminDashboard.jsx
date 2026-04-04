import { useEffect, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import client from '../api/client';
import TimesheetStatusBadge from '../components/TimesheetStatusBadge';
import DayRow from '../components/DayRow';

function weekLabel(weekStart) {
  const mon = parseISO(weekStart);
  return `${format(mon, 'MMM d')} – ${format(addDays(mon, 6), 'MMM d, yyyy')}`;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [workers, setWorkers] = useState([]);
  const [filterWorker, setFilterWorker] = useState('');

  useEffect(() => {
    client.get('/api/admin/users').then(r => setWorkers(r.data.filter(u => u.role === 'worker')));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === 'pending') params.set('status', 'submitted');
    if (filterMonth) params.set('month', filterMonth);
    if (filterWorker) params.set('user_id', filterWorker);
    client.get(`/api/admin/timesheets?${params}`).then(r => setTimesheets(r.data)).finally(() => setLoading(false));
  }, [tab, filterMonth, filterWorker]);

  async function openSheet(t) {
    const r = await client.get(`/api/admin/timesheets/${t.id}`);
    setSelected(r.data); setRejectMode(false); setRejectNote('');
  }

  async function approve() {
    await client.post(`/api/admin/timesheets/${selected.id}/approve`);
    setTimesheets(ts => ts.filter(t => t.id !== selected.id));
    setSelected(null);
  }

  async function reject() {
    await client.post(`/api/admin/timesheets/${selected.id}/reject`, { note: rejectNote });
    setTimesheets(ts => ts.filter(t => t.id !== selected.id));
    setSelected(null);
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Timesheets</h1>
          <p className="page-subtitle">Review and approve submitted timesheets</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs">
          <button className={`tab-btn${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
            Pending Review
          </button>
          <button className={`tab-btn${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
            All Timesheets
          </button>
        </div>

        <div className="filter-bar">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="form-input"
            style={{ width: 'auto' }}
          />
          <select
            value={filterWorker}
            onChange={e => setFilterWorker(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
          >
            <option value="">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {(filterMonth || filterWorker) && (
            <button className="btn btn-ghost-dark btn-sm" onClick={() => { setFilterMonth(''); setFilterWorker(''); }}>Clear</button>
          )}
        </div>
      </div>

      <div className="card card-overflow">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : timesheets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📥</div>
            <p>{tab === 'pending' ? 'No timesheets pending review' : 'No timesheets found'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {['Worker', 'Week', 'Status', 'Present Days', 'Total Hours', 'Submitted'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timesheets.map(t => (
                <tr key={t.id} className="clickable" onClick={() => openSheet(t)}>
                  <td className="td-strong">{t.worker_name}</td>
                  <td>{weekLabel(t.week_start)}</td>
                  <td><TimesheetStatusBadge status={t.status} /></td>
                  <td>{t.present_days}</td>
                  <td>{t.total_hours ? `${t.total_hours}h` : '—'}</td>
                  <td className="td-muted">{t.submitted_at ? format(new Date(t.submitted_at), 'MMM d') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>{selected.worker_name} — {weekLabel(selected.week_start)}</h2>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <TimesheetStatusBadge status={selected.status} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Present: <strong style={{ color: '#111827' }}>{selected.entries.filter(e => e.is_present).length} days</strong>
              </span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Hours: <strong style={{ color: '#111827' }}>{selected.entries.reduce((s, e) => s + (e.is_present && e.hours ? Number(e.hours) : 0), 0)}h</strong>
              </span>
            </div>

            <div className="card card-overflow" style={{ marginBottom: 16 }}>
              <div className="day-row day-row-header">
                <span>Day</span><span>Presence</span><span>Hours</span><span>Type</span><span>Notes</span>
              </div>
              {selected.entries.map(entry => (
                <DayRow key={entry.date} entry={entry} readOnly />
              ))}
            </div>

            {selected.status === 'submitted' && !rejectMode && (
              <div className="modal-actions">
                <button className="btn btn-success" onClick={approve}>✓ Approve</button>
                <button className="btn btn-danger" onClick={() => setRejectMode(true)}>Reject</button>
              </div>
            )}

            {rejectMode && (
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  Rejection note <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — shown to worker)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="e.g. Missing hours for Wednesday"
                  className="form-textarea"
                  style={{ marginBottom: 12 }}
                />
                <div className="modal-actions">
                  <button className="btn btn-danger" onClick={reject}>Confirm Reject</button>
                  <button className="btn btn-secondary" onClick={() => setRejectMode(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
