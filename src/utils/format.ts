/**
 * Formatting layer. Do not call toLocaleString() elsewhere — timezone and
 * locale become configurable here once the backend exposes preferences.
 */

const LOCALE = "pt-BR";
export const DISPLAY_TIMEZONE = "UTC";

const numberFmt = new Intl.NumberFormat(LOCALE);
// Brazilian presentation is numeric dd/MM/yyyy, not the "16 de ago. de 2026"
// that dateStyle:"medium" produces. Contractual timestamps are untouched -
// this is presentation only.
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DISPLAY_TIMEZONE,
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
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

/**
 * What is shown where a measurement does not exist.
 *
 * The backend now returns null for a percentile over an empty sample, an error
 * rate over no requests, a rate whose observed span is too short, and a trend
 * from a zero baseline. Rendering those as "0 ms" or "0.00%" would put a
 * measurement on screen that was never taken — which is the whole reason they
 * became nullable.
 */
export const NOT_MEASURED = "—";

export const formatPercentOrNull = (value: number | null, digits = 2) =>
  value === null ? NOT_MEASURED : formatPercent(value, digits);

export const formatMs = (value: number) => `${numberFmt.format(Math.round(value))} ms`;

export const formatMsOrNull = (value: number | null) =>
  value === null ? NOT_MEASURED : formatMs(value);

/**
 * Date formatters that report absence instead of throwing.
 *
 * Intl throws RangeError on an invalid Date, so a single unparseable value took
 * a whole page down. That happened twice: an empty string for "never happened"
 * on the provider pages, and again on the application detail for a certificate
 * that has never been issued.
 *
 * Guarding inside the formatter as well as at the source, because a screen
 * should not depend on every producer getting a date right — and the pattern has
 * already recurred.
 */
const invalid = (iso: string | null | undefined): boolean =>
  !iso || Number.isNaN(new Date(iso).getTime());

export const formatDateTime = (iso: string) =>
  invalid(iso) ? NOT_MEASURED : dateTimeFmt.format(new Date(iso));
export const formatDate = (iso: string) =>
  invalid(iso) ? NOT_MEASURED : dateFmt.format(new Date(iso));
export const formatTime = (iso: string) =>
  invalid(iso) ? NOT_MEASURED : timeFmt.format(new Date(iso));

/**
 * Relative time, or absence.
 *
 * The backend sends an empty string for "this never happened" — a provider that
 * has never answered, an instance never seen, a credential never rotated. An
 * empty string is not a date: `new Date("")` is NaN, and Intl.RelativeTimeFormat
 * throws a RangeError on it. That threw on every provider page.
 *
 * Guarding here as well as at the source, because a date that cannot be parsed
 * should never take down a screen whatever produced it.
 */
export function formatRelativeOrNull(
  iso: string | null | undefined,
  now = new Date("2026-08-16T14:00:00Z"),
): string {
  if (!iso) return NOT_MEASURED;
  if (Number.isNaN(new Date(iso).getTime())) return NOT_MEASURED;
  return formatRelative(iso, now);
}

/** As formatDateTime, but absence is absence rather than "Invalid Date". */
export function formatDateTimeOrNull(iso: string | null | undefined): string {
  if (!iso) return NOT_MEASURED;
  if (Number.isNaN(new Date(iso).getTime())) return NOT_MEASURED;
  return formatDateTime(iso);
}

export function formatRelative(iso: string, now = new Date("2026-08-16T14:00:00Z")): string {
  if (invalid(iso)) return NOT_MEASURED;
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
