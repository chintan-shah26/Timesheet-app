import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import client from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function defaultMonth() {
  return format(new Date(), 'yyyy-MM');
}

export default function MonthlyReport() {
  const [month, setMonth] = useState(defaultMonth());
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [report, setReport] = useState(null);
  const [employeeReport, setEmployeeReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get('/api/admin/users').then(r => setWorkers(r.data.filter(u => u.role === 'worker')));
  }, []);

  async function fetchReport() {
    setLoading(true); setReport(null); setEmployeeReport(null);
    try {
      if (selectedWorker) {
        const r = await client.get(`/api/admin/reports/monthly/employee?month=${month}&user_id=${selectedWorker}`);
        setEmployeeReport(r.data);
      } else {
        const r = await client.get(`/api/admin/reports/monthly?month=${month}`);
        setReport(r.data);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (employeeReport) {
      const header = 'Date,Present,Hours,Work Type,Notes,Timesheet Status';
      const rows = employeeReport.entries.map(e =>
        `${e.date},${e.is_present ? 'Yes' : 'No'},${e.is_present && e.hours ? e.hours : ''},"${e.work_type || ''}","${(e.notes || '').replace(/"/g, '""')}",${e.timesheet_status}`
      );
      rows.push(`TOTAL,${employeeReport.summary.total_present_days} days,${employeeReport.summary.total_hours}h,,,`);
      downloadCsv([header, ...rows].join('\n'), `report-${employeeReport.user.name.replace(/\s+/g, '-')}-${month}.csv`);
    } else if (report) {
      const header = 'Name,Email,Approved Timesheets,Present Days,Total Hours';
      const rows = report.workers.map(w =>
        `"${w.name}","${w.email}",${w.timesheet_count},${w.total_present_days},${w.total_hours}`
      );
      downloadCsv([header, ...rows].join('\n'), `monthly-report-${month}.csv`);
    }
  }

  function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const params = new URLSearchParams({ month });
    if (selectedWorker) params.set('user_id', selectedWorker);
    window.location.href = `${API_BASE}/api/admin/reports/monthly/export?${params}`;
  }

  const hasData = report || employeeReport;
  const totals = report?.workers.reduce(
    (acc, w) => ({ timesheets: acc.timesheets + Number(w.timesheet_count), days: acc.days + Number(w.total_present_days), hours: acc.hours + Number(w.total_hours) }),
    { timesheets: 0, days: 0, hours: 0 }
  );

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Monthly Report</h1>
          <p className="page-subtitle">View attendance and hours by month</p>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
        <div className="filter-bar">
          <div>
            <label className="form-label" style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="form-input"
              style={{ width: 'auto' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Employee</label>
            <select
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
              className="form-select"
              style={{ width: 180 }}
            >
              <option value="">All employees</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
              {loading ? 'Loading…' : 'Generate Report'}
            </button>
          </div>
          {hasData && (
            <>
              <div style={{ alignSelf: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={exportCsv}>↓ CSV</button>
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={exportExcel}>↓ Excel</button>
              </div>
            </>
          )}
        </div>
      </div>

      {report && (
        <div className="card card-overflow">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Approved timesheets for <strong style={{ color: '#111827' }}>{format(new Date(month + '-01'), 'MMMM yyyy')}</strong> — all employees
            </p>
          </div>
          <table>
            <thead>
              <tr>
                {['Worker', 'Email', 'Approved Timesheets', 'Present Days', 'Total Hours'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.workers.map(w => (
                <tr key={w.user_id}>
                  <td className="td-strong">{w.name}</td>
                  <td className="td-muted">{w.email}</td>
                  <td>{w.timesheet_count}</td>
                  <td><strong>{w.total_present_days}</strong></td>
                  <td>{w.total_hours > 0 ? `${w.total_hours}h` : '—'}</td>
                </tr>
              ))}
              {totals && (
                <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
                  <td colSpan={2}>Total</td>
                  <td>{totals.timesheets}</td>
                  <td>{totals.days}</td>
                  <td>{totals.hours > 0 ? `${totals.hours}h` : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {employeeReport && (
        <div className="card card-overflow">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>{employeeReport.user.name}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{employeeReport.user.email} · {format(new Date(month + '-01'), 'MMMM yyyy')}</p>
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280' }}>
              <span>Present: <strong style={{ color: '#111827' }}>{employeeReport.summary.total_present_days} days</strong></span>
              <span>Hours: <strong style={{ color: '#111827' }}>{employeeReport.summary.total_hours > 0 ? `${employeeReport.summary.total_hours}h` : '—'}</strong></span>
              <span>Timesheets: <strong style={{ color: '#111827' }}>{employeeReport.summary.timesheet_count}</strong></span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                {['Date', 'Present', 'Hours', 'Work Type', 'Notes', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeReport.entries.map(e => (
                <tr key={e.date} style={!e.is_present ? { opacity: 0.5 } : {}}>
                  <td className="td-strong">{format(parseISO(e.date), 'EEE, MMM d')}</td>
                  <td>{e.is_present ? 'Yes' : 'No'}</td>
                  <td>{e.is_present && e.hours ? `${e.hours}h` : '—'}</td>
                  <td>{e.work_type || '—'}</td>
                  <td className="td-muted">{e.notes || ''}</td>
                  <td style={{ textTransform: 'capitalize' }}>{e.timesheet_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasData && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>Select a month and click Generate Report</p>
        </div>
      )}
    </div>
  );
}
