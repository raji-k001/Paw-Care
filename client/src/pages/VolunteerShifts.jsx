import { useEffect, useState } from "react";
import api from "../api/axios";
import WeekCalendar from "../components/WeekCalendar";
import { addDays, startOfWeek } from "../utils/Week";

function TaskActions({ task, onChange, setError }) {
  const [completing, setCompleting] = useState(false);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (request) => {
    setError("");
    setBusy(true);
    try {
      await request();
      setCompleting(false);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    const reason = window.prompt("Why can't you do this task?");
    if (!reason?.trim()) return;
    send(() => api.put(`/tasks/${task._id}/respond`, { action: "decline", reason }));
  };

  const btn = "rounded px-2 py-1 text-white disabled:opacity-50";

  if (task.status === "Assigned") {
    return (
      <div className="mt-2 flex gap-1">
        <button disabled={busy} className={`${btn} bg-green-600`}
          onClick={() => send(() => api.put(`/tasks/${task._id}/respond`, { action: "accept" }))}>
          Accept
        </button>
        <button disabled={busy} className={`${btn} bg-red-600`} onClick={decline}>Decline</button>
      </div>
    );
  }

  if (task.status === "Accepted") {
    return completing ? (
      <div className="mt-2 space-y-1">
        <input type="number" min="0.25" max="24" step="0.25" placeholder="Hours worked" value={hours}
          onChange={(e) => setHours(e.target.value)} className="w-full rounded border px-1 py-1" />
        <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full rounded border px-1 py-1" />
        <div className="flex gap-1">
          <button disabled={busy} className={`${btn} bg-green-600`}
            onClick={() => send(() => api.put(`/tasks/${task._id}/complete`, { hours, note }))}>
            Save
          </button>
          <button className="rounded border px-2 py-1" onClick={() => setCompleting(false)}>Cancel</button>
        </div>
      </div>
    ) : (
      <button className={`${btn} mt-2 bg-blue-600`} onClick={() => setCompleting(true)}>Mark complete</button>
    );
  }

  if (task.status === "Completed") return <p className="mt-1 text-green-700">{task.hoursLogged} h logged</p>;
  if (task.status === "Declined" && task.declineReason) {
    return <p className="mt-1 text-red-600">You declined: {task.declineReason}</p>;
  }
  return null;
}

export default function VolunteerShifts() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get("/tasks/mine")
      .then((res) => setTasks(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your tasks"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const weekEnd = addDays(weekStart, 7);
  const weekTasks = tasks.filter((t) => {
    const start = new Date(t.startTime);
    return start >= weekStart && start < weekEnd;
  });
  const waiting = tasks.filter((t) => t.status === "Assigned");
  const reload = () => setRefresh((n) => n + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">My shifts</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      {waiting.length > 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm">
          <b>{waiting.length} task(s) waiting for your answer:</b>
          <ul className="mt-1 list-inside list-disc">
            {waiting.map((t) => (
              <li key={t._id}>
                {t.title} on {new Date(t.startTime).toLocaleString()}{" "}
                <button className="text-orange-600 underline"
                  onClick={() => setWeekStart(startOfWeek(new Date(t.startTime)))}>
                  show in calendar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <WeekCalendar weekStart={weekStart} onWeekChange={setWeekStart} tasks={weekTasks}
          renderTask={(t) => <TaskActions task={t} onChange={reload} setError={setError} />} />
      )}
    </div>
  );
}