import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import RescueMap from "../components/RescueMap";
import ReportButton from "../components/ReportButton";

const typeColor = { lost: "bg-red-100 text-red-700", found: "bg-green-100 text-green-700" };

export default function LostFoundDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [matches, setMatches] = useState([]);
  const [text, setText] = useState("");
  const [mainImage, setMainImage] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const isStaff = !!user && ["shelter_staff", "admin"].includes(user.role);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    api
      .get(`/lostfound/${id}`)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the report"));
  }, [id, refresh]);

  // The public view hides the owner, so we check our own list to know whether this report is ours
  useEffect(() => {
    if (!user) {
      setIsOwner(false);
      return;
    }
    api
      .get("/lostfound/mine")
      .then((res) => setIsOwner(res.data.some((r) => r._id === id)))
      .catch(() => {});
  }, [id, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOwner && !isStaff) return;
    api
      .get(`/lostfound/${id}/matches`)
      .then((res) => setMatches(res.data))
      .catch(() => {});
  }, [id, isOwner, isStaff, refresh]);

  const run = async (request, success) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await request();
      if (success) setNotice(success);
      setRefresh((n) => n + 1);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const contact = async () => {
    const ok = await run(() => api.post(`/lostfound/${id}/contact`, { message: text }), "Your message was sent. The owner will contact you.");
    if (ok) setText("");
  };

  if (!report) {
    return <p className={`p-6 ${error ? "text-red-600" : "text-gray-500"}`}>{error || "Loading..."}</p>;
  }

  const position = [report.location.coordinates[1], report.location.coordinates[0]];
  const details = [
    ["Species", report.species], ["Breed", report.breed], ["Colour", report.color],
    ["Gender", report.gender], ["Size", report.size], ["Markings", report.markings],
  ].filter(([, v]) => v && v !== "unknown");

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link to="/lostfound" className="text-sm text-orange-600">← All reports</Link>
      {notice && <p className="rounded bg-green-100 p-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-4 rounded-lg bg-white p-5 shadow">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${typeColor[report.type]}`}>{report.type}</span>
          <h1 className="text-2xl font-bold capitalize">{report.name || report.breed || report.species}</h1>
          <span className="text-sm text-gray-500">{report.status}</span>
        </div>

        {report.images.length > 0 && (
          <div>
            <img src={report.images[mainImage].url} alt="" className="h-64 w-full rounded object-cover" />
            <div className="mt-2 flex gap-2">
              {report.images.map((img, i) => (
                <img key={img.public_id} src={img.url} alt="" onClick={() => setMainImage(i)}
                  className={`h-14 w-14 cursor-pointer rounded object-cover ${i === mainImage ? "ring-2 ring-orange-500" : ""}`} />
              ))}
            </div>
          </div>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-gray-500">{label}</dt>
              <dd className="capitalize">{value}</dd>
            </div>
          ))}
          <dt className="text-gray-500">{report.type === "lost" ? "Lost on" : "Found on"}</dt>
          <dd>{new Date(report.date).toLocaleDateString()}</dd>
        </dl>
        <p className="text-gray-700">{report.description}</p>
        {report.address && <p className="text-sm text-gray-500">📍 {report.address}</p>}
        <RescueMap position={position} />
      </div>

      {(isOwner || isAdmin) && (
        <div className="flex flex-wrap gap-2 rounded-lg bg-white p-4 shadow">
          <span className="mr-2 self-center text-sm font-medium">Update status:</span>
          {report.status === "Open" ? (
            <>
              <button disabled={busy} onClick={() => run(() => api.put(`/lostfound/${id}/status`, { status: "Reunited" }))}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">
                {report.type === "lost" ? "My pet is back 🎉" : "Reunited with the owner 🎉"}
              </button>
              <button disabled={busy} onClick={() => run(() => api.put(`/lostfound/${id}/status`, { status: "Closed" }))}
                className="rounded border px-3 py-1 text-sm disabled:opacity-50">Close report</button>
            </>
          ) : (
            <button disabled={busy} onClick={() => run(() => api.put(`/lostfound/${id}/status`, { status: "Open" }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50">Reopen</button>
          )}
        </div>
      )}

      {(isOwner || isStaff) && (
        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-1 font-semibold">Possible matches</h2>
          <p className="mb-3 text-xs text-gray-500">
            Suggestions only. Please check the photos and details before you decide anything.
          </p>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-500">No matches found yet. We check again whenever a new report is posted.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <Link key={m.report._id} to={`/lostfound/${m.report._id}`}
                  className="flex gap-3 rounded border p-3 hover:bg-orange-50">
                  {m.report.images?.[0] ? (
                    <img src={m.report.images[0].url} alt="" className="h-16 w-16 rounded object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-orange-50">🐾</div>
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-medium capitalize">
                      {m.report.type} · {m.report.breed || m.report.species} · {m.report.color}
                    </p>
                    <p className="text-xs text-gray-500">{m.distanceKm} km away · {new Date(m.report.date).toLocaleDateString()}</p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {m.reasons.map((r) => (
                        <span key={r} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{r}</span>
                      ))}
                    </p>
                  </div>
                  <span className={`self-start rounded px-2 py-1 text-sm font-bold ${m.score >= 70 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {m.score}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {!isOwner && report.status === "Open" && (
        <section className="space-y-3 rounded-lg bg-white p-5 shadow">
          <h2 className="font-semibold">{report.type === "lost" ? "Have you seen this pet?" : "Is this your pet?"}</h2>
          {user ? (
            <>
              <textarea rows="3" maxLength="500" value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Write a short message. Your email and phone will be shared with the owner so they can reply."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              <button disabled={busy || text.trim().length < 5} onClick={contact}
                className="rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50">
                Send message
              </button>
            </>
          ) : (
            <Link to="/login" className="inline-block rounded bg-orange-600 px-4 py-2 text-sm text-white">Login to contact</Link>
          )}
        </section>
      )}

      {!isOwner && <ReportButton targetType="lostfound" targetId={report._id} />}
    </div>
  );
}