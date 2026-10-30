import { addDays, startOfWeek } from "../utils/Week";

const cardColors = {
  Assigned: "border-yellow-400 bg-yellow-50",
  Accepted: "border-blue-400 bg-blue-50",
  Declined: "border-red-300 bg-red-50",
  Completed: "border-green-400 bg-green-50",
  Cancelled: "border-gray-300 bg-gray-100 text-gray-500",
};

const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// weekStart: Date, onWeekChange(newStart), tasks: array, renderTask(task): extra content for a card
export default function WeekCalendar({ weekStart, onWeekChange, tasks, renderTask }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const btn = "rounded border bg-white px-3 py-1 text-sm hover:bg-orange-50";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className={btn} onClick={() => onWeekChange(addDays(weekStart, -7))}>← Previous</button>
        <div className="text-center">
          <p className="font-semibold">
            {days[0].toLocaleDateString([], { day: "numeric", month: "short" })} –{" "}
            {days[6].toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <button className="text-xs text-orange-600 hover:underline"
            onClick={() => onWeekChange(startOfWeek(new Date()))}>
            This week
          </button>
        </div>
        <button className={btn} onClick={() => onWeekChange(addDays(weekStart, 7))}>Next →</button>
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => new Date(t.startTime).toDateString() === day.toDateString());
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()}
              className={`min-h-24 rounded-lg p-2 ${isToday ? "bg-orange-100" : "bg-white"} shadow`}>
              <p className="mb-1 text-xs font-semibold text-gray-600">
                {day.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-2">
                {dayTasks.map((t) => (
                  <div key={t._id} className={`rounded border-l-4 p-2 text-xs ${cardColors[t.status]}`}>
                    <p className="font-semibold">{t.title}</p>
                    <p>{time(t.startTime)} – {time(t.endTime)}</p>
                    <p className="capitalize text-gray-500">
                      {t.type.replace("_", " ")} · {t.status}
                    </p>
                    {t.location && <p className="text-gray-500">📍 {t.location}</p>}
                    {renderTask && renderTask(t)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}