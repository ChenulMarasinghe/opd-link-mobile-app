const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

// "2026-10-12"
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-09-20" -> "20 Sep 2026"
export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// "2026-09-20" -> "20 September 2026"
export const formatLongDate = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;

// "HH:mm" (24h) -> "h:mm AM/PM"
export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
};

// "HH:mm" -> minutes since midnight
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const nowMinutes = (d: Date = new Date()) => d.getHours() * 60 + d.getMinutes();

// "08:30 AM" / "1:00 PM" -> minutes since midnight
export const slotToMinutes = (slot: string) => {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = Number(match[1]) % 12;
  const m = Number(match[2]);
  if (match[3].toUpperCase() === "PM") h += 12;
  return h * 60 + m;
};