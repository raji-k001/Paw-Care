import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const TYPES = [
  ["vaccination", "Vaccination"], ["deworming", "Deworming"], ["checkup", "Check-up"],
  ["treatment", "Treatment"], ["surgery", "Surgery"], ["sterilization", "Sterilization"], ["other", "Other"],
];

const typeColors = {
  vaccination: "bg-green-100 text-green-700",
  deworming: "bg-teal-100 text-teal-700",
  checkup: "bg-blue-100 text-blue-700",
  treatment: "bg-red-100 text-red-700",
  surgery: "bg-purple-100 text-purple-700",
  sterilization: "bg-pink-100 text-pink-700",
  other: "bg-gray-200 text-gray-700",
};

const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
const todayText = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  type: "vaccination", title: "", date: todayText(), diagnosis: "", treatment: "",
  medication: "", vetName: "", notes: "", nextDueDate: "",
});

export default function MedicalRecords() {
  const { petId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null); // { pet, records }
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0); // changing it clears the file input
  const [care, setCare] = useState({ sterilized: false, specialCare: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get(`/medical/pets/${petId}`)
      .then((res) => {
        setData(res.data);
        setCare({ sterilized: res.data.pet.sterilized, specialCare: res.data.pet.specialCare });
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load records"));
  }, [petId, refresh]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addRecord = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (files.length > 3) return setError("You can upload at most 3 documents");

    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "") body.append(key, value);
      });
      files.forEach((file) => body.append("documents", file));

      await api.post(`/medical/pets/${petId}`, body);
      setForm(emptyForm());
      setFiles([]);
      setFileKey((n) => n + 1);
      setShowForm(false);
      setMessage("Record added");
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the record");
    } finally {
      setBusy(false);
    }
  };

  const saveCare = async () => {
    setError("");
    setMessage("");
    try {
      await api.put(`/medical/pets/${petId}/care`, care);
      setMessage("Care details saved");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save care details");
    }
  };

  const markDone = async (id) => {
    setError("");
    try {
      await api.put(`/medical/records/${id}/followup-done`);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the follow-up");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this record permanently?")) return;
    setError("");
    try {
      await api.delete(`/medical/records/${id}`);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete the record");
    }
  };

  if (!data) {
    return (
      <div className="p-6">
        {error ? <p className="text-red-600">{error}</p> : <p className="text-gray-500">Loading...</p>}
        <Link to="/medical" className="mt-3 inline-block text-sm text-orange-600">← Back to medical records</Link>
      </div>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link to="/medical" className="text-sm text-orange-600">← Back to medical records</Link>
      <h1 className="text-2xl font-bold">
        {data.pet.name} <span className="text-base font-normal capitalize text-gray-500">({data.pet.species})</span>
      </h1>

      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Status and special care</h2>
        <p className="text-sm text-gray-600">
          Vaccinated: <b>{data.pet.vaccinated ? "Yes" : "No"}</b> (updates automatically when you add a
          vaccination record)
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={care.sterilized}
            onChange={(e) => setCare({ ...care, sterilized: e.target.checked })} />
          Sterilized
        </label>
        <textarea rows="2" maxLength="500" placeholder="Special care needs (diet, medication schedule, handling...)"
          value={care.specialCare} onChange={(e) => setCare({ ...care, specialCare: e.target.value })}
          className={input} />
        <button onClick={saveCare}
          className="rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700">
          Save
        </button>
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Add a record</h2>
          <button onClick={() => setShowForm(!showForm)} className="text-sm text-orange-600 hover:underline">
            {showForm ? "Close" : "+ New record"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addRecord} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <select name="type" value={form.type} onChange={update} className={input}>
                {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input name="title" required placeholder="Title * (e.g. Rabies vaccine)"
                value={form.title} onChange={update} className={`${input} sm:col-span-2`} />
              <label className="text-xs text-gray-600">
                Date *
                <input type="date" name="date" required value={form.date} onChange={update} className={input} />
              </label>
              <label className="text-xs text-gray-600">
                Next due / follow-up
                <input type="date" name="nextDueDate" value={form.nextDueDate} onChange={update} className={input} />
              </label>
              <label className="text-xs text-gray-600">
                Vet name
                <input name="vetName" value={form.vetName} onChange={update} className={input}
                  placeholder={user.role === "veterinarian" ? user.name : ""} />
              </label>
            </div>
            <input name="diagnosis" placeholder="Diagnosis" value={form.diagnosis} onChange={update} className={input} />
            <input name="treatment" placeholder="Treatment given" value={form.treatment} onChange={update} className={input} />
            <input name="medication" placeholder="Medication and dosage" value={form.medication} onChange={update} className={input} />
            <textarea name="notes" rows="2" maxLength="1000" placeholder="Notes" value={form.notes}
              onChange={update} className={input} />
            <label className="block text-sm">
              Reports or prescriptions (up to 3, image or PDF)
              <input key={fileKey} type="file" multiple accept="image/*,.pdf"
                onChange={(e) => setFiles(Array.from(e.target.files))} className="mt-1 block w-full text-sm" />
            </label>
            <button disabled={busy}
              className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50">
              {busy ? "Saving..." : "Save record"}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">History ({data.records.length})</h2>
        {data.records.length === 0 ? (
          <p className="text-sm text-gray-500">No records yet.</p>
        ) : (
          <div className="space-y-3">
            {data.records.map((r) => {
              const overdue = r.nextDueDate && !r.followUpDone && new Date(r.nextDueDate) < startOfToday;
              const rows = [
                ["Diagnosis", r.diagnosis], ["Treatment", r.treatment], ["Medication", r.medication],
                ["Vet", r.vetName], ["Notes", r.notes],
              ].filter(([, value]) => value);

              return (
                <div key={r._id} className="rounded-lg bg-white p-4 shadow">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${typeColors[r.type]}`}>
                        {r.type}
                      </span>
                      <span className="font-semibold">{r.title}</span>
                    </div>
                    <span className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()}</span>
                  </div>

                  {rows.length > 0 && (
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      {rows.map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-gray-500">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {r.documents.length > 0 && (
                    <p className="mt-2 text-sm">
                      Documents:{" "}
                      {r.documents.map((d, i) => (
                        <a key={d.public_id} href={d.url} target="_blank" rel="noreferrer"
                          className="mr-2 text-orange-600 underline">
                          File {i + 1}
                        </a>
                      ))}
                    </p>
                  )}

                  {r.nextDueDate && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-2 text-sm">
                      <span className={overdue ? "font-semibold text-red-600" : "text-gray-700"}>
                        Next due: {new Date(r.nextDueDate).toLocaleDateString()} {overdue && "(overdue)"}
                      </span>
                      {r.followUpDone ? (
                        <span className="text-green-600">✓ Done</span>
                      ) : (
                        <button onClick={() => markDone(r._id)}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">
                          Mark follow-up done
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Recorded by {r.recordedBy?.name} ({r.recordedBy?.role})</span>
                    {user.role === "admin" && (
                      <button onClick={() => remove(r._id)} className="text-red-500 hover:underline">Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}