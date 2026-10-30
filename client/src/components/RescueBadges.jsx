const urgencyColors = {
  Low: "bg-blue-100 text-blue-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-600 text-white",
};

const statusColors = {
  Reported: "bg-gray-200 text-gray-700",
  Assigned: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
};

export function UrgencyBadge({ urgency }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${urgencyColors[urgency] || ""}`}>
      {urgency}
    </span>
  );
}

export function RescueStatusBadge({ status }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[status] || ""}`}>
      {status}
    </span>
  );
}