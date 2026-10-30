import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function VolunteerHub() {
  const [data, setData] = useState(null); // { profile, stats, minHours }
  const [certs, setCerts] = useState([]);
  const [form, setForm] = useState({
    skills: "", availableDays: [], preferredTime: "flexible", city: "", bio: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [me, mine] = await Promise.all([api.get("/volunteers/me"), api.get("/certificates/mine")]);
      setData(me.data);
      setCerts(mine.data);
      const p = me.data.profile;
      if (p) {
        setForm({
          skills: p.skills.join(", "),
          availableDays: p.availableDays,
          preferredTime: p.preferredTime,
          city: p.city || "",
          bio: p.bio || "",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your volunteer data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api.put("/volunteers/me", {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setMessage("Profile saved");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the profile");
    } finally {
      setBusy(false);
    }
  };

  const requestCertificate = async () => {
    setError("");
    setMessage("");
    try {
      await api.post("/certificates");
      setMessage("Certificate requested. An admin will review it.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not request the certificate");
    }
  };

  if (!data) return <p className="p-6 text-gray-500">{error || "Loading..."}</p>;

  const { profile, stats, minHours } = data;
  const hasPending = certs.some((c) => c.status === "Pending");

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Volunteer hub</h1>
      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-2xl font-bold text-orange-600">{stats.hours}</p>
          <p className="text-xs text-gray-500">Hours volunteered</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-2xl font-bold text-orange-600">{stats.tasks}</p>
          <p className="text-xs text-gray-500">Tasks completed</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className={`text-sm font-semibold ${profile?.verified ? "text-green-600" : "text-yellow-600"}`}>
            {!profile ? "No profile yet" : profile.verified ? "✓ Verified" : "Waiting for verification"}
          </p>
          <p className="text-xs text-gray-500">Profile status</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Your volunteer profile</h2>
        <input placeholder="Skills, separated by commas (first aid, driving, dog handling)"
          value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={input} />

        <div>
          <p className="mb-1 text-sm text-gray-600">Days you are usually available</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {DAYS.map((d) => (
              <label key={d} className="flex items-center gap-1">
                <input type="checkbox" checked={form.availableDays.includes(d)} onChange={() => toggleDay(d)} />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.preferredTime}
            onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} className={input}>
            <option value="flexible">Any time</option>
            <option value="morning">Mornings</option>
            <option value="afternoon">Afternoons</option>
            <option value="evening">Evenings</option>
          </select>
          <input placeholder="City" value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
        </div>

        <textarea rows="3" maxLength="500" placeholder="A short note about yourself" value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })} className={input} />

        <button disabled={busy}
          className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {busy ? "Saving..." : profile ? "Update profile" : "Register as volunteer"}
        </button>
      </form>

      <div className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Certificates</h2>
        <p className="text-sm text-gray-500">
          You can request a participation certificate after {minHours} volunteer hours.
        </p>
        <button onClick={requestCertificate}
          disabled={!profile?.verified || hasPending || stats.hours < minHours}
          className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-40">
          Request certificate
        </button>

        {certs.length > 0 && (
          <ul className="space-y-2 text-sm">
            {certs.map((c) => (
              <li key={c._id} className="flex items-center justify-between rounded border p-2">
                <span>
                  {new Date(c.createdAt).toLocaleDateString()} · {c.hoursAtRequest} h · <b>{c.status}</b>
                  {c.reviewNote && ` · ${c.reviewNote}`}
                </span>
                {c.status === "Approved" && (
                  <Link to={`/certificates/${c._id}`} className="text-orange-600 underline">View certificate</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}