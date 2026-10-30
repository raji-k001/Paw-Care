import { useEffect, useState } from "react";
import api from "../api/axios";
import WeekCalendar from "../components/WeekCalendar";
import { addDays, startOfWeek } from "../utils/Week";

const input = "w-full rounded border border-gray-300 px-3 py-2";
const emptyForm = {
  title: "", type: "feeding", description: "", location: "", start: "", end: "", assigneeId: "",
};

export default function StaffTasks() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api.get("/volunteers", { params: { verified: true } })
      .then((res) => setVolunteers(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/tasks", { params: { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() } })
      .then((res) => setTasks(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load tasks"));
  }, [weekStart, refresh]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/tasks", {
        title: form.title, type: form.type, description: form.description, location: form.location,
        assigneeId: form.assigneeId,
        startTime: new Date(form.start).toISOString(),
        endTime: new Date(form.end).toISOString(),
      });
      setWeekStart(startOfWeek(new Date(form.start))); // jump to the week of the new task
      setForm(emptyForm);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the task");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancel this task?")) return;
    setError("");
    try {
      await api.put(`/tasks/${id}/cancel`);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel the task");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Volunteer tasks</h1>
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={create} className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Assign a new task</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="title" required placeholder="Title *" value={form.title} onChange={update} className={input} />
          <select name="type" value={form.type} onChange={update} className={input}>
            <option value="rescue">Rescue</option>
            <option value="feeding">Feeding</option>
            <option value="transportation">Transportation</option>
            <option value="shelter_duty">Shelter duty</option>
            <option value="other">Other</option>
          </select>
          <input name="location" placeholder="Location" value={form.location} onChange={update} className={input} />
          <label className="text-sm text-gray-600">
            Starts *
            <input type="datetime-local" name="start" required value={form.start} onChange={update} className={input} />
          </label>
          <label className="text-sm text-gray-600">
            Ends *
            <input type="datetime-local" name="end" required value={form.end} onChange={update} className={input} />
          </label>
          <label className="text-sm text-gray-600">
            Volunteer *
            <select name="assigneeId" required value={form.assigneeId} onChange={update} className={input}>
              <option value="">Choose a verified volunteer</option>
              {volunteers.map((v) => (
                <option key={v._id} value={v.user._id}>
                  {v.user.name}{v.skills.length > 0 && ` (${v.skills.join(", ")})`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea name="description" rows="2" maxLength="1000" placeholder="Details" value={form.description}
          onChange={update} className={input} />
        {volunteers.length === 0 && (
          <p className="text-sm text-yellow-700">No verified volunteers yet. Verify one on the Volunteers page first.</p>
        )}
        <button disabled={busy}
          className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {busy ? "Assigning..." : "Assign task"}
        </button>
      </form>

      <WeekCalendar weekStart={weekStart} onWeekChange={setWeekStart} tasks={tasks}
        renderTask={(t) => (
          <div className="mt-1 space-y-1">
            <p className="font-medium">👤 {t.assignedTo?.name}</p>
            {t.status === "Declined" && t.declineReason && <p className="text-red-600">{t.declineReason}</p>}
            {t.status === "Completed" && <p className="text-green-700">{t.hoursLogged} h logged</p>}
            {["Assigned", "Accepted"].includes(t.status) && (
              <button onClick={() => cancel(t._id)} className="text-red-600 underline">Cancel task</button>
            )}
          </div>
        )} />
    </div>
  );
}