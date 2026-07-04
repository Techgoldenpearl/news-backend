import { db } from "../config/db.js";
import { utilityData } from "../../drizzle/schema.js";
import { eq, and, isNull } from "drizzle-orm";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type FetchedValue = {
  dataType: "petrol" | "diesel" | "gold" | "silver" | "sensex" | "nifty";
  city: string | null;
  value: string;
  change: string | null;
  changePercent: string | null;
  unit: string;
};

function formatChange(diff: number): string {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(2)}`;
}

function formatChangePercent(diff: number, base: number): string {
  const pct = base !== 0 ? (diff / base) * 100 : 0;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

async function fetchYahooIndex(symbol: string): Promise<{ price: number; prevClose: number } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Yahoo Finance ${symbol} returned ${res.status}`);
  const json: any = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number") return null;
  return { price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose ?? meta.regularMarketPrice };
}

async function fetchSensex(): Promise<FetchedValue | null> {
  const data = await fetchYahooIndex("^BSESN");
  if (!data) return null;
  const diff = data.price - data.prevClose;
  return {
    dataType: "sensex", city: "National",
    value: data.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    change: formatChange(diff), changePercent: formatChangePercent(diff, data.prevClose),
    unit: "points",
  };
}

async function fetchNifty(): Promise<FetchedValue | null> {
  const data = await fetchYahooIndex("^NSEI");
  if (!data) return null;
  const diff = data.price - data.prevClose;
  return {
    dataType: "nifty", city: "National",
    value: data.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    change: formatChange(diff), changePercent: formatChangePercent(diff, data.prevClose),
    unit: "points",
  };
}

async function fetchFuelPrice(kind: "petrol" | "diesel"): Promise<FetchedValue | null> {
  const url = `https://www.goodreturns.in/${kind}-price-in-new-delhi.html`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GoodReturns ${kind} page returned ${res.status}`);
  const html = await res.text();
  const match = html.match(/id="fp-price"[^>]*>&#8377;([\d.]+)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return {
    dataType: kind, city: "Delhi",
    value: value.toFixed(2), change: null, changePercent: null,
    unit: "₹/litre",
  };
}

async function fetchGold(): Promise<FetchedValue | null> {
  const url = "https://www.goodreturns.in/gold-rates/delhi.html";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GoodReturns gold page returned ${res.status}`);
  const html = await res.text();
  const match = html.match(/id="24K-price"[^>]*>&#x20b9;([\d,]+)/);
  if (!match) return null;
  const perGram = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(perGram)) return null;
  const per10g = perGram * 10;
  return {
    dataType: "gold", city: "National",
    value: per10g.toLocaleString("en-IN"), change: null, changePercent: null,
    unit: "₹/10g",
  };
}

async function fetchSilver(): Promise<FetchedValue | null> {
  const url = "https://www.goodreturns.in/silver-rates/delhi.html";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GoodReturns silver page returned ${res.status}`);
  const html = await res.text();
  const match = html.match(/id="silver-1kg-price"[^>]*>&#x20b9;([\d,]+)/);
  if (!match) return null;
  const perKg = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(perKg)) return null;
  return {
    dataType: "silver", city: "National",
    value: perKg.toLocaleString("en-IN"), change: null, changePercent: null,
    unit: "₹/kg",
  };
}

async function upsert(item: FetchedValue) {
  const cityCondition = item.city === null ? isNull(utilityData.city) : eq(utilityData.city, item.city);
  const [existing] = await db.select({ id: utilityData.id }).from(utilityData)
    .where(and(eq(utilityData.dataType, item.dataType), cityCondition))
    .limit(1);

  if (existing) {
    await db.update(utilityData).set({
      value: item.value, change: item.change, changePercent: item.changePercent,
      unit: item.unit, updatedAt: new Date(),
    }).where(eq(utilityData.id, existing.id));
  } else {
    await db.insert(utilityData).values({ ...item, updatedAt: new Date() });
  }
}

const FETCHERS: Array<[string, () => Promise<FetchedValue | null>]> = [
  ["sensex", fetchSensex],
  ["nifty", fetchNifty],
  ["petrol", () => fetchFuelPrice("petrol")],
  ["diesel", () => fetchFuelPrice("diesel")],
  ["gold", fetchGold],
  ["silver", fetchSilver],
];

export async function refreshUtilityData(): Promise<void> {
  let succeeded = 0;
  for (const [label, fetcher] of FETCHERS) {
    try {
      const result = await fetcher();
      if (!result) {
        console.error(`[UtilityData] ${label}: fetch returned no data (source markup may have changed)`);
        continue;
      }
      await upsert(result);
      succeeded++;
    } catch (err: any) {
      console.error(`[UtilityData] ${label}: failed —`, err?.message ?? err);
    }
  }
  console.log(`[UtilityData] Refreshed ${succeeded}/${FETCHERS.length} data points`);
}
