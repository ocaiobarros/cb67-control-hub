/**
 * Formatting layer. Do not call toLocaleString() elsewhere — timezone and
 * locale become configurable here once the backend exposes preferences.
 */

const LOCALE = "en-US";
export const DISPLAY_TIMEZONE = "UTC";

const numberFmt = new Intl.NumberFormat(LOCALE);
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: DISPLAY_TIMEZONE,
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeZone: DISPLAY_TIMEZONE,
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
});

export const formatNumber = (value: number) => numberFmt.format(value);

export const formatCompact = (value: number) =>
  new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number, digits = 2) => `${value.toFixed(digits)}%`;

export const formatMs = (value: number) => `${numberFmt.format(Math.round(value))} ms`;

export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export function formatRelative(iso: string, now = new Date("2026-08-16T14:00:00Z")): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1000],
  ];
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "";
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export const formatRatio = (used: number, total: number) =>
  `${numberFmt.format(used)} / ${numberFmt.format(total)}`;

export const daysUntil = (iso: string, now = new Date("2026-08-16T14:00:00Z")) =>
  Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
