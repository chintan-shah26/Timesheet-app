import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, addDays } from "date-fns";
import client from "../api/client";
import DayRow from "../components/DayRow";
import TimesheetStatusBadge from "../components/TimesheetStatusBadge";

function buildDefaultEntries(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(parseISO(weekStart), i), "yyyy-MM-dd");
    return {
      date,
      is_present: false,
      hours: null,
      work_type: null,
      notes: null,
    };
  });
}

export default function WeeklyTimesheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.get(`/api/timesheets/${id}`).then((r) => {
      setSheet(r.data);
      setEntries(
        r.data.entries.length > 0
          ? r.data.entries
          : buildDefaultEntries(r.data.week_start),
      );
    });
  }, [id]);

  const readOnly = sheet?.status !== "draft";

  async function saveDraft() {
    setSaving(true);
    try {
      await client.put(`/api/timesheets/${id}/entries`, { entries });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function recallSheet() {
    await client.post(`/api/timesheets/${id}/recall`);
    setSheet((s) => ({ ...s, status: "draft" }));
  }

  async function submitSheet() {
    setSaving(true);
    try {
      await client.put(`/api/timesheets/${id}/entries`, { entries });
      await client.post(`/api/timesheets/${id}/submit`);
      setSheet((s) => ({ ...s, status: "submitted" }));
      setSubmitting(false);
    } finally {
      setSaving(false);
    }
  }

  if (!sheet) return <div className="loading">Loading…</div>;

  const mon = parseISO(sheet.week_start);
  const sun = addDays(mon, 6);
  const weekLabel = `${format(mon, "MMM d")} – ${format(sun, "MMM d, yyyy")}`;
  const presentCount = entries.filter((e) => e.is_present).length;
  const totalHours = entries.reduce(
    (s, e) => s + (e.is_present && e.hours ? Number(e.hours) : 0),
    0,
  );

  return (
    <div className="container page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button className="back-link" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="sep" />
        <h1 className="page-title" style={{ fontSize: 16 }}>
          Week of {weekLabel}
        </h1>
        <TimesheetStatusBadge status={sheet.status} />
      </div>

      {sheet.admin_note && (
        <div className="alert-warning" style={{ marginBottom: 16 }}>
          <strong>Note from admin:</strong> {sheet.admin_note}
        </div>
      )}

      <div className="stats-bar">
        <span>
          Present: <strong>{presentCount} days</strong>
        </span>
        <span>
          Total Hours: <strong>{totalHours}h</strong>
        </span>
      </div>

      <div className="card card-overflow" style={{ marginBottom: 16 }}>
        <div className="day-row day-row-header">
          <span>Day</span>
          <span>Presence</span>
          <span>Hours</span>
          <span>Type</span>
          <span>Notes</span>
        </div>
        {entries.map((entry, i) => (
          <DayRow
            key={entry.date}
            entry={entry}
            readOnly={readOnly}
            onChange={(updated) =>
              setEntries((prev) =>
                prev.map((e, idx) => (idx === i ? updated : e)),
              )
            }
          />
        ))}
      </div>

      {(sheet.status === "submitted" || sheet.status === "rejected") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <button className="btn btn-secondary" onClick={recallSheet}>
            Edit Timesheet
          </button>
          <small style={{ color: "#888" }}>
            This will withdraw your submission so you can make changes.
          </small>
        </div>
      )}

      {!readOnly && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={saveDraft}
            disabled={saving}
          >
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setSubmitting(true)}
            disabled={saving}
          >
            Submit for Review
          </button>
        </div>
      )}

      {submitting && (
        <div className="modal-overlay" onClick={() => setSubmitting(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit timesheet?</h2>
            <p>
              Once submitted, you won't be able to edit this timesheet unless
              the admin rejects it.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={submitSheet}
                disabled={saving}
              >
                {saving ? "Submitting…" : "Confirm Submit"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSubmitting(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
