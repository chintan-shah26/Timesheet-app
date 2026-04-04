import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import client from '../api/client';
import TimesheetStatusBadge from '../components/TimesheetStatusBadge';

function getMondayOfCurrentWeek() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function weekLabel(weekStart) {
  const mon = parseISO(weekStart);
  const sun = addDays(mon, 6);
  return `${format(mon, 'MMM d')} – ${format(sun, 'MMM d, yyyy')}`;
}

export default function Dashboard() {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/api/timesheets').then(r => setTimesheets(r.data)).finally(() => setLoading(false));
  }, []);

  async function createNewWeek() {
    const weekStart = getMondayOfCurrentWeek();
    setCreating(true);
    try {
      const r = await client.post('/api/timesheets', { week_start: weekStart });
      navigate(`/timesheets/${r.data.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        const existing = timesheets.find(t => t.week_start === weekStart);
        if (existing) navigate(`/timesheets/${existing.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">My Timesheets</h1>
          <p className="page-subtitle">Track your weekly attendance and hours</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary btn-sm" onClick={createNewWeek} disabled={creating}>
            {creating ? 'Creating…' : '+ New Week'}
          </button>
        </div>
      </div>

      <div className="card card-overflow">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : timesheets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🕐</div>
            <p>No timesheets yet</p>
            <small>Start by creating one for the current week</small>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Status</th>
                <th>Present Days</th>
                <th>Total Hours</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(t => (
                <tr key={t.id} className="clickable" onClick={() => navigate(`/timesheets/${t.id}`)}>
                  <td className="td-strong">{weekLabel(t.week_start)}</td>
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
    </div>
  );
}
