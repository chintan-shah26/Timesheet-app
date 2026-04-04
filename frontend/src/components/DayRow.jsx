import { format, parseISO } from 'date-fns';

const WORK_TYPES = [
  { value: '', label: '—' },
  { value: 'Remote', label: 'Remote' },
  { value: 'On-site', label: 'On-site' },
  { value: 'Leave', label: 'Leave' },
  { value: 'Holiday', label: 'Holiday' },
];

export default function DayRow({ entry, onChange, readOnly }) {
  const dayLabel = format(parseISO(entry.date), 'EEE, MMM d');

  function update(field, value) {
    if (readOnly) return;
    onChange({ ...entry, [field]: value });
  }

  return (
    <div className={`day-row${!entry.is_present ? ' absent' : ''}`}>
      <span className={`day-label${!entry.is_present ? ' absent' : ''}`}>{dayLabel}</span>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: readOnly ? 'default' : 'pointer' }}>
        <span className="toggle-switch">
          <input
            type="checkbox"
            checked={!!entry.is_present}
            onChange={e => update('is_present', e.target.checked)}
            disabled={readOnly}
          />
          <span className="toggle-track" />
          <span className="toggle-thumb" />
        </span>
        <span className={`presence-label${entry.is_present ? ' present' : ''}`}>
          {entry.is_present ? 'Present' : 'Absent'}
        </span>
      </label>

      <input
        type="number"
        min="0.5"
        max="24"
        step="0.5"
        placeholder="Hours"
        value={entry.hours ?? ''}
        disabled={!entry.is_present || readOnly}
        onChange={e => update('hours', e.target.value ? parseFloat(e.target.value) : null)}
        className="form-input"
        style={{ width: '80px' }}
      />

      <select
        value={entry.work_type ?? ''}
        disabled={!entry.is_present || readOnly}
        onChange={e => update('work_type', e.target.value || null)}
        className="form-select"
      >
        {WORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      <input
        type="text"
        placeholder="Notes (optional)"
        value={entry.notes ?? ''}
        disabled={readOnly}
        onChange={e => update('notes', e.target.value || null)}
        className="form-input"
      />
    </div>
  );
}
