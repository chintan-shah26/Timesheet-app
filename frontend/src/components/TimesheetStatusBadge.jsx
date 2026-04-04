export default function TimesheetStatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>{status}</span>
  );
}
