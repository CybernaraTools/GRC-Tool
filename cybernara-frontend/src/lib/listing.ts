export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type PageQuery = {
  limit: number;
  offset: number;
};

export function firstValue(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export function textParam(params: SearchParamsRecord, key: string): string {
  return firstValue(params[key]).trim();
}

export function parsePage(params: SearchParamsRecord, prefix: string, defaultLimit = 25): PageQuery {
  return {
    limit: boundedNumber(firstValue(params[`${prefix}Limit`]), defaultLimit, 100),
    offset: boundedNumber(firstValue(params[`${prefix}Offset`]), 0, 100_000)
  };
}

export function pageHref(pathname: string, params: SearchParamsRecord, prefix: string, nextOffset: number): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    if (Array.isArray(input)) {
      for (const value of input) {
        search.append(key, value);
      }
    } else if (typeof input === "string" && input.length > 0) {
      search.set(key, input);
    }
  }
  search.set(`${prefix}Offset`, String(Math.max(0, nextOffset)));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function unknownToText(value: unknown, fallback = "Not provided"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "Not recorded";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short"
  }).format(new Date(value));
}

function boundedNumber(raw: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}
