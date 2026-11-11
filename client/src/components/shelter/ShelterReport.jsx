import { useEffect, useState } from "react";
import api from "../../api/axios";
import { inr } from "../../utils/money";

const thisMonth = () => new Date().toISOString().slice(0, 7);

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-white p-4 text-center shadow">
    <p className="text-2xl font-bold text-orange-600">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

export default function ShelterReport({ shelterId }) {
  const [month, setMonth] = useState(thisMonth());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/shelters/${shelterId}/report`, { params: { month } })
      .then((res) => {
        setReport(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load the report"));
  }, [shelterId, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <label className="text-sm">
          Month{" "}
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <button onClick={() => window.print()}
          className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">
          Print or save as PDF
        </button>
      </div>

      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      {report && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{report.shelterName}: report for {report.month}</h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Admitted" value={report.intakes} />
            <Stat label="Adopted" value={report.adoptions} />
            <Stat label="Transferred in / out" value={`${report.transfersIn} / ${report.transfersOut}`} />
            <Stat label="Currently in care" value={`${report.occupancy.occupied} / ${report.occupancy.capacity}`} />
          </div>

          <section className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Discharges ({report.totalDischarges})</h3>
            {report.totalDischarges === 0 ? (
              <p className="text-sm text-gray-500">None this month.</p>
            ) : (
              <ul className="text-sm">
                {Object.entries(report.discharges).map(([reason, count]) => (
                  <li key={reason} className="flex justify-between border-b py-1 capitalize">
                    <span>{reason.replaceAll("_", " ")}</span><b>{count}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Expenses: {inr(report.expenses.total)}</h3>
            {Object.keys(report.expenses.byCategory).length === 0 ? (
              <p className="text-sm text-gray-500">No expenses recorded.</p>
            ) : (
              <ul className="text-sm">
                {Object.entries(report.expenses.byCategory).map(([cat, total]) => (
                  <li key={cat} className="flex justify-between border-b py-1 capitalize">
                    <span>{cat}</span><b>{inr(total)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Low stock right now</h3>
            {report.lowStock.length === 0 ? (
              <p className="text-sm text-green-700">All supplies are above their alert level.</p>
            ) : (
              <ul className="text-sm">
                {report.lowStock.map((i) => (
                  <li key={i._id} className="flex justify-between border-b py-1">
                    <span>{i.name}</span>
                    <b className="text-red-600">{i.quantity} {i.unit}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}