import { useEffect, useState } from "react";
import api from "../../api/axios";
import { inr } from "../../utils/money";

const input = "rounded border border-gray-300 px-3 py-2 text-sm";
const thisMonth = () => new Date().toISOString().slice(0, 7);
const emptyForm = { category: "food", description: "", amount: "", date: "" };

export default function ShelterExpenses({ shelterId }) {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState({ expenses: [], total: 0 });
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get(`/shelters/${shelterId}/expenses`, { params: month ? { month } : {} })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load expenses"));
  }, [shelterId, month, refresh]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== "" && body.append(k, v));
      if (receipt) body.append("receipt", receipt);
      await api.post(`/shelters/${shelterId}/expenses`, body);
      setForm(emptyForm);
      setReceipt(null);
      setFileKey((n) => n + 1);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the expense");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={add} className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Record an expense</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <select name="category" value={form.category} onChange={update} className={input}>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="veterinary">Veterinary</option>
            <option value="utilities">Utilities</option>
            <option value="transport">Transport</option>
            <option value="other">Other</option>
          </select>
          <input name="description" required placeholder="What was it for? *" value={form.description}
            onChange={update} className={`${input} sm:col-span-2`} />
          <input name="amount" type="number" required min="1" step="1" placeholder="Amount (₹) *"
            value={form.amount} onChange={update} className={input} />
          <input name="date" type="date" value={form.date} onChange={update} className={input} />
          <input key={fileKey} type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files[0] || null)}
            className="text-sm sm:col-span-3" />
        </div>
        <button className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">Add expense</button>
      </form>

      <div className="flex items-center justify-between">
        <label className="text-sm">
          Month <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={input} />
        </label>
        <p className="text-sm">Total: <b>{inr(data.total)}</b></p>
      </div>

      {data.expenses.length === 0 ? (
        <p className="text-gray-500">No expenses in this period.</p>
      ) : (
        <ul className="divide-y rounded-lg bg-white shadow">
          {data.expenses.map((x) => (
            <li key={x._id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {x.description}
                <span className="ml-2 text-xs capitalize text-gray-400">
                  {x.category} · {new Date(x.date).toLocaleDateString()}
                </span>
                {x.receipt?.url && (
                  <a href={x.receipt.url} target="_blank" rel="noreferrer"
                    className="ml-2 text-xs text-orange-600 underline">receipt</a>
                )}
              </span>
              <b>{inr(x.amount)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}