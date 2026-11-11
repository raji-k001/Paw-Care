import ReportButton from "../components/ReportButton";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { inr } from "../utils/money";
import { loadRazorpay } from "../utils/razorpay";
import { ProgressBar } from "./Campaigns";

const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

function EditForm({ campaign, onSave }) {
  const [form, setForm] = useState({
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    goalAmount: String(campaign.goalAmount),
    endDate: campaign.endDate ? campaign.endDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, goalAmount: Number(form.goalAmount) });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-medium">Edit campaign details</p>
      <input name="title" required maxLength="120" value={form.title} onChange={update} className={input} />
      <textarea name="description" required rows="5" maxLength="2000" value={form.description}
        onChange={update} className={input} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select name="category" value={form.category} onChange={update} className={input}>
          <option value="medical">Medical treatment</option>
          <option value="food">Food</option>
          <option value="shelter">Shelter</option>
          <option value="other">Other</option>
        </select>
        <label className="text-xs text-gray-600">
          Goal (₹)
          <input name="goalAmount" type="number" required min="100" step="1" value={form.goalAmount}
            onChange={update} className={input} />
        </label>
        <label className="text-xs text-gray-600">
          End date (empty = no end date)
          <input name="endDate" type="date" value={form.endDate} onChange={update} className={input} />
        </label>
      </div>
      <button disabled={saving}
        className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

export default function CampaignDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("500");
  const [anonymous, setAnonymous] = useState(false);
  const [expense, setExpense] = useState({ description: "", amount: "", date: "" });
  const [receipt, setReceipt] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get(`/campaigns/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the campaign"));
  }, [id, refresh]);

  const donate = async () => {
    if (!user) return navigate("/login");
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (!(await loadRazorpay())) {
        throw new Error("Could not load the payment window. Check your internet connection or ad blocker.");
      }
      const { data: order } = await api.post("/donations/order", {
        campaignId: id, amount: Number(amount), anonymous,
      });

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "PawCare",
        description: order.campaignTitle,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#ea580c" },
        handler: async (response) => {
          // response holds the payment id, order id and signature. The server checks them.
          try {
            const { data: paid } = await api.post("/donations/verify", response);
            navigate(`/donations/${paid._id}/receipt`);
          } catch (err) {
            setError(err.response?.data?.message || "Payment could not be verified");
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", (res) => {
        setError(res.error?.description || "The payment failed. You were not charged.");
        setBusy(false);
      });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not start the payment");
      setBusy(false);
    }
  };

  const manage = async (request, successText) => {
    setError("");
    setMessage("");
    try {
      await request();
      if (successText) setMessage(successText);
      setRefresh((n) => n + 1);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      return false;
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    const body = new FormData();
    Object.entries(expense).forEach(([key, value]) => value !== "" && body.append(key, value));
    if (receipt) body.append("receipt", receipt);

    const ok = await manage(() => api.post(`/campaigns/${id}/expenses`, body), "Expense added");
    if (ok) {
      setExpense({ description: "", amount: "", date: "" });
      setReceipt(null);
      setFileKey((n) => n + 1);
    }
  };

  if (!data) {
    return <p className={`p-6 ${error ? "text-red-600" : "text-gray-500"}`}>{error || "Loading..."}</p>;
  }

  const { campaign, summary, recentDonors, donorCount } = data;
  const canManage = user && (user.role === "admin" || campaign.createdBy?._id === user._id);
  const ended = campaign.endDate && new Date(campaign.endDate) < new Date();
  const open = campaign.status === "Active" && !ended;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <Link to="/campaigns" className="text-sm text-orange-600">← All campaigns</Link>
      {message && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {campaign.image?.url && <img src={campaign.image.url} alt="" className="h-64 w-full object-cover" />}
        <div className="space-y-3 p-5">
          <p className="text-xs uppercase text-gray-500">
            {campaign.category} · {campaign.status}
            {campaign.endDate && ` · ends ${new Date(campaign.endDate).toLocaleDateString()}`}
          </p>
          <h1 className="text-2xl font-bold">{campaign.title}</h1>
          <p className="whitespace-pre-line text-gray-700">{campaign.description}</p>
          <ProgressBar raised={campaign.raisedAmount} goal={campaign.goalAmount} />
          <p className="text-xs text-gray-500">
            {donorCount} donation(s) · organised by {campaign.createdBy?.name}
          </p>
        </div>
      </div>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Donate</h2>
        {!open ? (
          <p className="text-sm text-gray-600">
            {ended ? "This campaign has ended." : `This campaign is ${campaign.status.toLowerCase()}.`} Thank you
            to everyone who helped.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[100, 500, 1000, 2000].map((v) => (
                <button key={v} type="button" onClick={() => setAmount(String(v))}
                  className={`rounded border px-3 py-1 text-sm ${
                    Number(amount) === v ? "border-orange-600 bg-orange-50" : "hover:bg-orange-50"
                  }`}>
                  {inr(v)}
                </button>
              ))}
              <input type="number" min="10" max="100000" step="1" value={amount}
                onChange={(e) => setAmount(e.target.value)} className="w-32 rounded border px-3 py-1 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Donate anonymously (your name will not be shown publicly)
            </label>
            <button onClick={donate} disabled={busy}
              className="rounded bg-orange-600 px-5 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
              {busy ? "Processing..." : user ? `Donate ${inr(amount)}` : "Login to donate"}
            </button>
            <p className="text-xs text-gray-500">Test mode: no real money is charged.</p>
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Where the money goes</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded bg-green-50 p-3">
            <p className="text-xl font-bold text-green-700">{inr(summary.income)}</p>
            <p className="text-xs text-gray-600">Received</p>
          </div>
          <div className="rounded bg-red-50 p-3">
            <p className="text-xl font-bold text-red-700">{inr(summary.expenses)}</p>
            <p className="text-xs text-gray-600">Spent</p>
          </div>
          <div className="rounded bg-blue-50 p-3">
            <p className="text-xl font-bold text-blue-700">{inr(summary.balance)}</p>
            <p className="text-xs text-gray-600">Remaining</p>
          </div>
        </div>

        {campaign.expenses.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No expenses recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {campaign.expenses.map((x) => (
              <li key={x._id} className="flex items-center justify-between py-2">
                <span>
                  {x.description}
                  <span className="ml-2 text-xs text-gray-400">{new Date(x.date).toLocaleDateString()}</span>
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
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold">Recent supporters</h2>
        {recentDonors.length === 0 ? (
          <p className="text-sm text-gray-500">Be the first to donate. 🐾</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recentDonors.map((d, i) => (
              <li key={i} className="flex justify-between">
                <span>{d.name}</span>
                <span className="text-gray-600">
                  {inr(d.amount)} · {new Date(d.paidAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && (
        <>
          <section className="space-y-4 rounded-lg border-2 border-dashed border-orange-300 p-5">
            <h2 className="font-semibold">Manage this campaign</h2>
            <EditForm
              key={campaign.updatedAt}
              campaign={campaign}
              onSave={(body) => manage(() => api.put(`/campaigns/${id}`, body), "Campaign updated")}
            />
            <label className="block text-sm">
              Status
              <select value={campaign.status} className={`${input} mt-1 max-w-xs`}
                onChange={(e) => manage(() => api.put(`/campaigns/${id}`, { status: e.target.value }), "Status updated")}>
                <option>Active</option>
                <option>Completed</option>
                <option>Closed</option>
              </select>
            </label>

            <form onSubmit={addExpense} className="space-y-3">
              <p className="text-sm font-medium">Record an expense</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <input required placeholder="What was it for? *" value={expense.description}
                  onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                  className={`${input} sm:col-span-2`} />
                <input required type="number" min="1" step="1" placeholder="Amount (₹) *" value={expense.amount}
                  onChange={(e) => setExpense({ ...expense, amount: e.target.value })} className={input} />
                <input type="date" value={expense.date}
                  onChange={(e) => setExpense({ ...expense, date: e.target.value })} className={input} />
                <input key={fileKey} type="file" accept="image/*,.pdf"
                  onChange={(e) => setReceipt(e.target.files[0] || null)} className="text-sm sm:col-span-2" />
              </div>
              <button className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">
                Add expense
              </button>
            </form>
          </section>
          <ReportButton targetType="campaign" targetId={campaign._id} />
        </>
      )}
    </div>
  );
}