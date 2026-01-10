"use client";

import { LogCard } from "./LogCard";
import { EmptyState } from "./EmptyState";

interface LogTimelineProps {
  logs: any[];
  grow: any;
  loading: boolean;
  onEdit: (log: any) => void;
  onDelete: (logId: string) => void;
  deletingLogId: string | null;
}

function daysBetween(a: string, b: string = new Date().toISOString()): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function LogTimeline({ logs, grow, loading, onEdit, onDelete, deletingLogId }: LogTimelineProps) {
  if (loading) {
    return (
      <div style={{ paddingLeft: 24, marginTop: 20 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              marginBottom: 24,
              paddingLeft: 32,
              padding: 16,
              borderRadius: 16,
              border: "1px solid #333",
              background: "#111",
              height: 120,
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <EmptyState />;
  }

  const today = new Date().toISOString().split("T")[0];
  const growStartDate = grow?.start_date || new Date().toISOString().split("T")[0];

  // Group logs by date for separators
  const logsByDate: { [key: string]: any[] } = {};
  logs.forEach(log => {
    const dateKey = log.created_at.split("T")[0];
    if (!logsByDate[dateKey]) {
      logsByDate[dateKey] = [];
    }
    logsByDate[dateKey].push(log);
  });

  const sortedDates = Object.keys(logsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div style={{ position: "relative", paddingLeft: 24, marginTop: 20 }}>
      {/* Timeline line */}
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 0,
          bottom: 0,
          width: 2,
          background: "linear-gradient(to bottom, #34d399, #10b981)",
          opacity: 0.3,
        }}
      />

      {/* Today marker */}
      {sortedDates.includes(today) && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -8,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#10b981",
            border: "3px solid #000",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "#000",
          }}
          title="Today"
        >
          T
        </div>
      )}

      {/* Log entries */}
      {logs.map((log, index) => {
        const logDate = new Date(log.created_at);
        const dayNumber = daysBetween(growStartDate, log.created_at) + 1;
        const weekNumber = Math.floor((dayNumber - 1) / 7) + 1;
        const dateKey = log.created_at.split("T")[0];
        const isNewDate = index === 0 || logs[index - 1].created_at.split("T")[0] !== dateKey;
        const isToday = dateKey === today;

        return (
          <div key={log.id}>
            {/* Date separator */}
            {isNewDate && (
              <div
                style={{
                  marginTop: index > 0 ? 32 : 0,
                  marginBottom: 16,
                  paddingLeft: 32,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isToday ? "#34d399" : "#666",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {isToday ? "Today" : logDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: logDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                })}
              </div>
            )}

            <LogCard
              log={log}
              dayNumber={dayNumber}
              weekNumber={weekNumber}
              growStartDate={growStartDate}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingLogId={deletingLogId}
            />
          </div>
        );
      })}
    </div>
  );
}
