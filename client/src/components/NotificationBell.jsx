import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setData(res.data);
    } catch {
      // ignore: the bell just keeps showing the last data
    }
  }, []);

  // Load once, then check for new notifications every 30 seconds
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  // Close the dropdown when clicking outside it
  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      await api.put(`/notifications/${n._id}/read`).catch(() => {});
      load();
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await api.put("/notifications/read-all").catch(() => {});
    load();
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => { setOpen(!open); load(); }} className="relative text-xl" aria-label="Notifications">
        🔔
        {data.unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white">
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="font-semibold">Notifications</span>
            {data.unreadCount > 0 && (
              <button onClick={markAll} className="text-xs text-orange-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data.notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
            ) : (
              data.notifications.map((n) => (
                <button key={n._id} onClick={() => openItem(n)}
                  className={`block w-full border-b px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                    n.read ? "text-gray-500" : "bg-orange-50/60 font-medium"
                  }`}>
                  {n.message}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}