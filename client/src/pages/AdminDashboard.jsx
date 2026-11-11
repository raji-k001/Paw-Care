import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../api/axios";
import { inr } from "../utils/money";

const COLORS = {
  Available: "#16a34a", Pending: "#eab308", Adopted: "#6b7280",
  Approved: "#16a34a", Rejected: "#dc2626", Withdrawn: "#9ca3af",
  Low: "#3b82f6", Medium: "#eab308", High: "#f97316", Critical: "#dc2626",
};

const ROLE_NAMES = {
  adopter: "Adopters", volunteer: "Volunteers", shelter_staff: "Shelter staff",
  veterinarian: "Veterinarians", admin: "Admins",
};

// Turns { Pending: 3 } into [{ name: "Pending", value: 3 }, ...] in a fixed order
const toData = (map = {}, names) => names.map((name) => ({ name, value: map[name] || 0 }));
const total = (data) => data.reduce((s, d) => s + d.value, 0);

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-3xl font-bold text-orange-600">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// The chart area needs a fixed height, otherwise ResponsiveContainer collapses to nothing
function ChartCard({ title, empty, children }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {empty ? (
        <p className="py-16 text-center text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </section>
  );
}

function StatusBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" name="Count">
          {data.map((d) => <Cell key={d.name} fill={COLORS[d.name] || "#f97316"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/dashboard")
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load the dashboard"))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (!data) {
    return (
      <p className={`p-6 ${error ? "text-red-600" : "text-gray-500"}`}>
        {error || "Loading dashboard..."}
      </p>
    );
  }

  const petData = toData(data.pets.byStatus, ["Available", "Pending", "Adopted"]);
  const appData = toData(data.applications.byStatus, ["Pending", "Approved", "Rejected", "Withdrawn"]);
  const urgencyData = toData(data.rescues.openByUrgency, ["Low", "Medium", "High", "Critical"]);

  const attention = [
    [data.attention.pendingApplications, "adoption application(s) waiting for review", "/staff/applications"],
    [data.attention.unassignedRescues, "rescue case(s) not assigned yet", "/rescues"],
    [data.attention.unverifiedVolunteers, "volunteer(s) waiting for verification", "/staff/volunteers"],
    [data.attention.pendingCertificates, "certificate request(s) to review", "/admin/certificates"],
    [data.attention.overdueFollowUps, "overdue medical follow-up(s)", "/medical"],
    [data.attention.pendingShelters, "shelter registration(s) waiting for approval", "/admin/shelters"],
  ].filter(([count]) => count > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          Updated {new Date(data.generatedAt).toLocaleTimeString()}
          <button onClick={() => setRefresh((n) => n + 1)} disabled={loading}
            className="rounded border border-orange-600 px-3 py-1 text-orange-600 hover:bg-orange-50 disabled:opacity-50">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Registered users" value={data.users.total} />
        <StatCard label="Animals" value={data.pets.total}
          hint={`${data.pets.byStatus.Available || 0} available`} />
        <StatCard label="Adopted" value={data.pets.byStatus.Adopted || 0}
          hint={`${data.pets.underTreatment} under treatment`} />
        <StatCard label="Open rescue cases" value={data.rescues.open}
          hint={`${data.rescues.resolved} resolved`} />
        <StatCard label="Volunteers" value={data.volunteers.verified}
          hint={`${data.volunteers.unverified} awaiting verification`} />
        <StatCard label="Volunteer hours" value={data.volunteers.hours}
          hint={`${data.volunteers.completedTasks} tasks done`} />
        <StatCard label="Donations received" value={inr(data.donations.total)}
  hint={`${data.donations.count} donations · ${data.donations.activeCampaigns} active campaigns`} />
        <StatCard label="Shelters" value={data.shelters.approved} />
        <StatCard label="Pending Shelters" value={data.shelters.pending} />
      </div>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-green-700">Everything is up to date. 🎉</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {attention.map(([count, text, to]) => (
              <li key={text}>
                <Link to={to} className="hover:underline">
                  <b className="text-orange-600">{count}</b> {text} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChartCard title="Adoptions and rescue reports (last 6 months)"
        empty={total(data.monthly.map((m) => ({ value: m.adoptions + m.rescues }))) === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="adoptions" name="Adoptions" stroke="#16a34a" strokeWidth={2} />
            <Line type="monotone" dataKey="rescues" name="Rescue reports" stroke="#dc2626" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Donations per month (₹)" empty={data.monthly.every((m) => m.donations === 0)}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data.monthly}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(v) => inr(v)} />
      <Bar dataKey="donations" name="Donations" fill="#ea580c" />
    </BarChart>
  </ResponsiveContainer>
</ChartCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Animals by status" empty={total(petData) === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={petData} dataKey="value" nameKey="name" outerRadius={85} label>
                {petData.map((d) => <Cell key={d.name} fill={COLORS[d.name]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Adoption applications by status" empty={total(appData) === 0}>
          <StatusBars data={appData} />
        </ChartCard>

        <ChartCard title="Open rescue cases by urgency" empty={total(urgencyData) === 0}>
          <StatusBars data={urgencyData} />
        </ChartCard>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 font-semibold">Users by role</h2>
          <ul className="space-y-2 text-sm">
            {Object.keys(ROLE_NAMES).map((role) => (
              <li key={role} className="flex justify-between border-b pb-1">
                <span>{ROLE_NAMES[role]}</span>
                <b>{data.users.byRole[role] || 0}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}