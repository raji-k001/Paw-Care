import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { inr } from "../utils/money";

export default function Receipt() {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/donations/${id}`)
      .then((res) => setDonation(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the receipt"));
  }, [id]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!donation) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex gap-3 print:hidden">
        <button onClick={() => window.print()}
          className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700">
          Print or save as PDF
        </button>
        <Link to="/my-donations" className="rounded border px-4 py-2 text-sm">My donations</Link>
      </div>

      <div className="space-y-4 border-4 border-double border-orange-300 bg-white p-8">
        <div className="text-center">
          <p className="text-3xl">🐾</p>
          <h1 className="text-2xl font-bold text-orange-600">PawCare</h1>
          <p className="text-gray-600">Donation receipt</p>
        </div>

        <p className="text-center text-4xl font-bold">{inr(donation.amount)}</p>
        <p className="text-center text-gray-700">Thank you, {donation.donor.name}, for your generous donation.</p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-gray-500">Receipt no.</dt><dd>{donation.receiptNumber}</dd>
          <dt className="text-gray-500">Date</dt><dd>{new Date(donation.paidAt).toLocaleString()}</dd>
          <dt className="text-gray-500">Campaign</dt><dd>{donation.campaign?.title}</dd>
          <dt className="text-gray-500">Payment ID</dt><dd>{donation.razorpayPaymentId}</dd>
          <dt className="text-gray-500">Shown publicly as</dt>
          <dd>{donation.anonymous ? "Anonymous" : donation.donor.name}</dd>
        </dl>

        <p className="border-t pt-3 text-xs text-gray-400">
          This receipt acknowledges your donation. It is not a tax-exemption certificate. Payments in test
          mode are not real transactions.
        </p>
      </div>
    </div>
  );
}