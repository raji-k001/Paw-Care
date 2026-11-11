import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const input = "rounded border border-gray-300 px-2 py-1 text-sm";
const REASONS = [
  ["returned_to_owner", "Returned to owner"],
  ["released", "Released"],
  ["deceased", "Passed away"],
  ["other", "Other (add a note)"],
];

export default function ShelterAnimals({ shelterId, onChange }) {
  const [animals, setAnimals] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [action, setAction] = useState(null); // { petId, type: "transfer" | "discharge" }
  const [form, setForm] = useState({ toShelterId: "", reason: "returned_to_owner", note: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get(`/shelters/${shelterId}/animals`)
      .then((res) => setAnimals(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load animals"))
      .finally(() => setLoading(false));
  }, [shelterId, refresh]);

  useEffect(() => {
    api.get("/shelters").then((res) => setShelters(res.data.filter((s) => s._id !== shelterId))).catch(() => {});
  }, [shelterId]);

  const open = (petId, type) => {
    setAction({ petId, type });
    setError("");
    setMessage("");
    setForm({ toShelterId: "", reason: "returned_to_owner", note: "" });
  };

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const body =
        action.type === "transfer"
          ? { petId: action.petId, toShelterId: form.toShelterId, note: form.note }
          : { petId: action.petId, reason: form.reason, note: form.note };
      const res = await api.post(`/shelters/${shelterId}/${action.type}`, body);
      setMessage(res.data.message);
      setAction(null);
      setRefresh((n) => n + 1);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-3">
      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      <p className="text-sm text-gray-500">
        New animals are admitted by adding a pet. Adopted pets leave automatically.
      </p>

      {animals.length === 0 ? (
        <p className="text-gray-500">No animals in care.</p>
      ) : (
        animals.map((a) => (
          <div key={a._id} className="rounded-lg bg-white p-3 shadow">
            <div className="flex items-center gap-3">
              {a.images?.[0] ? (
                <img src={a.images[0].url} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-orange-50">🐾</div>
              )}
              <div className="flex-1">
                <Link to={`/pets/${a._id}`} className="font-medium hover:text-orange-600">{a.name}</Link>
                <p className="text-xs capitalize text-gray-500">{a.breed || a.species} · {a.status}</p>
              </div>
              <button onClick={() => open(a._id, "transfer")} disabled={a.status === "Adopted"}
                className="rounded border px-2 py-1 text-xs hover:bg-orange-50 disabled:opacity-40">
                Transfer
              </button>
              <button onClick={() => open(a._id, "discharge")}
                className="rounded border px-2 py-1 text-xs hover:bg-orange-50">
                Discharge
              </button>
            </div>

            {action?.petId === a._id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                {action.type === "transfer" ? (
                  <select value={form.toShelterId} onChange={(e) => setForm({ ...form, toShelterId: e.target.value })}
                    className={input}>
                    <option value="">Move to which shelter?</option>
                    {shelters.map((s) => (
                      <option key={s._id} value={s._id} disabled={s.occupied >= s.capacity}>
                        {s.name} ({s.city}) {s.occupied >= s.capacity ? "- full" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className={input}>
                    {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                )}
                <input placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className={`${input} flex-1`} />
                <button disabled={busy} onClick={submit}
                  className="rounded bg-orange-600 px-3 py-1 text-sm text-white disabled:opacity-50">
                  Confirm
                </button>
                <button onClick={() => setAction(null)} className="rounded border px-3 py-1 text-sm">Cancel</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}