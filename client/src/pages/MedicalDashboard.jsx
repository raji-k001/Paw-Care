import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function MedicalDashboard() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [due, setDue] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    Promise.all([api.get("/medical/pets"), api.get("/medical/due")])
      .then(([p, d]) => {
        setPets(p.data);
        setDue(d.data);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load medical data"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const runReminders = async () => {
    setError("");
    setMessage("");
    try {
      const res = await api.post("/medical/run-reminders");
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reminders");
    }
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const shown = pets.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Medical records</h1>
        {user.role === "admin" && (
          <button onClick={runReminders}
            className="rounded border border-orange-600 px-3 py-1 text-sm text-orange-600 hover:bg-orange-50">
            Send due reminders now
          </button>
        )}
      </div>

      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-3 font-semibold">Due in the next 30 days</h2>
            {due.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing is due. 🎉</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {due.map((r) => {
                  const overdue = new Date(r.nextDueDate) < startOfToday;
                  return (
                    <li key={r._id} className="flex items-center justify-between rounded border p-2">
                      <span>
                        <Link to={`/medical/${r.pet?._id}`} className="font-medium text-orange-600 hover:underline">
                          {r.pet?.name || "Pet removed"}
                        </Link>{" "}
                        · {r.title}
                      </span>
                      <span className={overdue ? "font-semibold text-red-600" : "text-gray-600"}>
                        {overdue ? "Overdue · " : ""}
                        {new Date(r.nextDueDate).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Open a pet's records</h2>
              <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-gray-500">
                No pets found.{" "}
                {user.role === "shelter_staff" && "You can only open records for pets you listed."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p) => (
                  <Link key={p._id} to={`/medical/${p._id}`}
                    className="flex items-center gap-3 rounded-lg bg-white p-3 shadow hover:shadow-lg">
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt="" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-orange-50">🐾</div>
                    )}
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs capitalize text-gray-500">{p.breed || p.species} · {p.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <button className="hidden" onClick={() => setRefresh((n) => n + 1)} />
    </div>
  );
}