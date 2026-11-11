import { useEffect, useState } from "react";
import api from "../../api/axios";

const input = "rounded border border-gray-300 px-3 py-2 text-sm";
const emptyForm = { name: "", category: "food", quantity: "", unit: "kg", lowStockThreshold: "5", expiryDate: "" };

function Row({ item, shelterId, onChange, setError }) {
  const [amount, setAmount] = useState("");

  const adjust = async (sign) => {
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter how much to add or use");
    setError("");
    try {
      await api.put(`/shelters/${shelterId}/supplies/${item._id}/adjust`, { change: sign * value });
      setAmount("");
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the stock");
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${item.name}?`)) return;
    try {
      await api.delete(`/shelters/${shelterId}/supplies/${item._id}`);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove the item");
    }
  };

  const low = item.quantity <= item.lowStockThreshold;
  const expired = item.expiryDate && new Date(item.expiryDate) < new Date();

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 shadow ${low ? "bg-red-50" : "bg-white"}`}>
      <div>
        <p className="font-medium">{item.name} <span className="text-xs capitalize text-gray-500">({item.category})</span></p>
        <p className="text-sm">
          <b className={low ? "text-red-600" : ""}>{item.quantity} {item.unit}</b>
          {low && <span className="ml-2 text-xs text-red-600">Low stock</span>}
          {item.expiryDate && (
            <span className={`ml-2 text-xs ${expired ? "text-red-600" : "text-gray-500"}`}>
              {expired ? "Expired " : "Expires "}{new Date(item.expiryDate).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <input type="number" min="0" step="any" placeholder="Amount" value={amount}
          onChange={(e) => setAmount(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm" />
        <button onClick={() => adjust(1)} className="rounded bg-green-600 px-2 py-1 text-xs text-white">+ Add</button>
        <button onClick={() => adjust(-1)} className="rounded bg-yellow-500 px-2 py-1 text-xs text-white">− Use</button>
        <button onClick={remove} className="px-2 text-xs text-red-500 hover:underline">Remove</button>
      </div>
    </div>
  );
}

export default function ShelterSupplies({ shelterId }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get(`/shelters/${shelterId}/supplies`)
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load supplies"))
      .finally(() => setLoading(false));
  }, [shelterId, refresh]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const reload = () => setRefresh((n) => n + 1);

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = {};
      Object.entries(form).forEach(([k, v]) => v !== "" && (body[k] = v));
      await api.post(`/shelters/${shelterId}/supplies`, body);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the item");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={add} className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="font-semibold">Add an item</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Name * (e.g. Dog food)" value={form.name} onChange={update} className={input} />
          <select name="category" value={form.category} onChange={update} className={input}>
            <option value="food">Food</option>
            <option value="medicine">Medicine</option>
            <option value="supplies">Supplies</option>
            <option value="other">Other</option>
          </select>
          <input name="unit" placeholder="Unit (kg, packs...)" value={form.unit} onChange={update} className={input} />
          <input name="quantity" type="number" min="0" step="any" placeholder="Quantity" value={form.quantity}
            onChange={update} className={input} />
          <label className="text-xs text-gray-600">
            Alert when stock is at or below
            <input name="lowStockThreshold" type="number" min="0" step="any" value={form.lowStockThreshold}
              onChange={update} className={`${input} w-full`} />
          </label>
          <label className="text-xs text-gray-600">
            Expiry date (optional)
            <input name="expiryDate" type="date" value={form.expiryDate} onChange={update} className={`${input} w-full`} />
          </label>
        </div>
        <button className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">Add item</button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No supplies recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <Row key={i._id} item={i} shelterId={shelterId} onChange={reload} setError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}