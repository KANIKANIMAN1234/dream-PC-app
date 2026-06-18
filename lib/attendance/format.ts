import type { AttendanceEventType, AttendanceLog } from "@/lib/attendance/types";

const JST = "Asia/Tokyo";

export function workDateJst(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JST }).format(new Date(iso));
}

export function formatHm(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function sortedLogs(logs: AttendanceLog[]): AttendanceLog[] {
  return [...logs].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

export function calculateWorkMinutes(logs: AttendanceLog[]): number {
  const sorted = sortedLogs(logs);
  let total = 0;
  let segmentStart: Date | null = null;

  for (const log of sorted) {
    const at = new Date(log.occurred_at);
    if (log.event_type === "start" || log.event_type === "work") {
      segmentStart = at;
    } else if ((log.event_type === "out" || log.event_type === "end") && segmentStart) {
      total += (at.getTime() - segmentStart.getTime()) / 60_000;
      segmentStart = null;
    }
  }

  return Math.max(0, Math.floor(total));
}

export function calculateBreakMinutes(logs: AttendanceLog[]): number {
  const sorted = sortedLogs(logs);
  let total = 0;
  let breakStart: Date | null = null;

  for (const log of sorted) {
    const at = new Date(log.occurred_at);
    if (log.event_type === "out") {
      breakStart = at;
    } else if (log.event_type === "work" && breakStart) {
      total += (at.getTime() - breakStart.getTime()) / 60_000;
      breakStart = null;
    }
  }

  return Math.max(0, Math.floor(total));
}

export function getFirstEventTime(logs: AttendanceLog[], type: AttendanceEventType): string | null {
  const hit = sortedLogs(logs).find((log) => log.event_type === type);
  return hit ? formatHm(hit.occurred_at) : null;
}

export function getLastEventTime(logs: AttendanceLog[], type: AttendanceEventType): string | null {
  const hits = sortedLogs(logs).filter((log) => log.event_type === type);
  const last = hits.at(-1);
  return last ? formatHm(last.occurred_at) : null;
}
