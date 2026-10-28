import type { User } from "@/lib/api/users";
import { formatDbText } from "@/lib/formatDisplayText";

export function displayFullName(user: User | null | undefined): string {
  const name = formatDbText(user?.name);
  if (name) return name;
  const first = formatDbText(user?.first_name);
  const last = formatDbText(user?.last_name);
  const both = `${first} ${last}`.trim();
  return both || "—";
}

export function displayInitials(user: User | null | undefined): string {
  const first = String(user?.first_name ?? "").trim();
  const last = String(user?.last_name ?? "").trim();
  if (first || last) {
    const a = first ? first[0] : "";
    const b = last ? last[0] : "";
    const s = `${a}${b}`.trim();
    if (s.length) return s.toUpperCase();
  }
  const name = String(user?.name ?? "").trim();
  if (!name) return "A";
  const parts = name.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  const s = `${a}${b}`.trim();
  return (s.length ? s : "A").toUpperCase();
}

export function displayEmail(user: User | null | undefined): string {
  const email = String(user?.email ?? "").trim();
  return email || "—";
}

export function displayPhone(user: User | null | undefined): string {
  const phone = String(user?.phone ?? "").trim();
  return phone || "—";
}
