import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import ShelterAnimals from "../components/shelter/ShelterAnimals";
import ShelterSupplies from "../components/shelter/ShelterSupplies";
import ShelterExpenses from "../components/shelter/ShelterExpenses";
import ShelterReport from "../components/shelter/ShelterReport";


const TABS = ["Overview", "Animals", "Supplies", "Expenses", "Report"];
const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

const moveText = (m) => {
  const pet = m.pet?.name || "An animal";
  if (m.type === "intake") return `${pet} was admitted`;
  if (m.type === "transfer_in") return `${pet} arrived from ${m.fromShelter?.name}`;
  if (m.type === "transfer_out") return `${pet} moved to ${m.toShelter?.name}`;
  return `${pet} was discharged (${(m.reason || "other").replaceAll("_", " ")})`;
};

function Overview({ shelter, occupied, onSaved }) {
  const [form, setForm] = useState({
    phone: shelter.phone, email: shelter.email || "", address: shelter.address,
    description: shelter.description || "", capacity: String(shelter.capacity),
  });
  const [moves, setMoves] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/shelters/${shelter._id}/movements`).then((res) => setMoves(res.data)).catch(() => {});
  }, [shelter._id, occupied]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const pct = Math.min(100, Math.round((occupied / shelter.capacity) * 100));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.put(`/shelters/${shelter._id}`, { ...form, capacity: Number(form.capacity) });
      setMessage("Saved");
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-2 font-semibold">Capacity</h2>
        <div className="h-3 overflow-hidden rounded bg-gray-200">
          <div className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          <b>{occupied}</b> of {shelter.capacity} places used · {Math.max(0, shelter.capacity - occupied)} free
        </p>
      </section>

      <form onSubmit={save} className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Shelter details</h2>
        {message && <p className="rounded bg-green-100 p-2 text-sm text-green-700">{message}</p>}
        {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="phone" required value={form.phone} onChange={update} className={input} placeholder="Phone" />
          <input name="email" type="email" value={form.email} onChange={update} className={input} placeholder="Email" />
          <label className="text-xs text-gray-600">
            Capacity
            <input name="capacity" type="number" min="1" step="1" required value={form.capacity}
              onChange={update} className={input} />
          </label>
        </div>
        <input name="address" required value={form.address} onChange={update} className={input} placeholder="Address" />
        <textarea name="description" rows="2" maxLength="1000" value={form.description} onChange={update}
          className={input} placeholder="About the shelter" />
        <button className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">Save</button>
      </form>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-2 font-semibold">Recent activity</h2>
        {moves.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet. Adding a pet records an intake.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {moves.map((m) => (
              <li key={m._id} className="flex gap-3">
                <span className="w-32 shrink-0 text-gray-400">{new Date(m.date).toLocaleDateString()}</span>
                <span>{moveText(m)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ShelterHub() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const shelterId = params.get("shelterId");
  const [data, setData] = useState(undefined); // undefined = loading, null = no shelter
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);


  useEffect(() => {
    api
      .get("/shelters/mine", { params: shelterId ? { shelterId } : {} })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load your shelter");
        setData(null);
      });
  }, [shelterId, refresh]);

  if (data === undefined) return <p className="p-6 text-gray-500">Loading...</p>;

  if (data === null) {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-8">
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {user.role === "admin" ? (
        <p className="text-gray-700">
          Admins don't own a shelter. Open one from{" "}
          <Link to="/admin/shelters" className="text-orange-600 underline">Manage Shelters</Link>.
        </p>
      ) : (
        <>
          <p className="text-gray-700">There is no shelter linked to your account yet.</p>
          <Link to="/shelters/register" className="inline-block rounded bg-orange-600 px-4 py-2 text-white">
            Register a shelter
          </Link>
        </>
      )}
    </div>
  );
}
  

  const { shelter, occupied } = data;

  if (shelter.status !== "Approved") {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-bold">{shelter.name}</h1>
        {shelter.status === "Pending" ? (
          <p className="rounded bg-yellow-50 p-3 text-yellow-800">
            Your registration is waiting for admin approval. You will get a notification.
          </p>
        ) : (
          <>
            <p className="rounded bg-red-50 p-3 text-red-700">Not approved: {shelter.rejectionReason}</p>
            <Link to="/shelters/register" className="inline-block rounded bg-orange-600 px-4 py-2 text-white">
              Register again
            </Link>
          </>
        )}
      </div>
    );
  }

  const reload = () => setRefresh((n) => n + 1);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">{shelter.name}</h1>
        <p className="text-sm text-gray-500">{shelter.address}, {shelter.city}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded px-3 py-1 text-sm ${
              tab === t ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview shelter={shelter} occupied={occupied} onSaved={reload} />}
      {tab === "Animals" && <ShelterAnimals shelterId={shelter._id} onChange={reload} />}
      {tab === "Supplies" && <ShelterSupplies shelterId={shelter._id} />}
      {tab === "Expenses" && <ShelterExpenses shelterId={shelter._id} />}
      {tab === "Report" && <ShelterReport shelterId={shelter._id} />}
    </div>
  );
}