/**
 * Market figures shown on the getting-started page.
 *
 * Every number here is a real, published figure with a citation. Do not add
 * unsourced statistics: pharmacies make a commercial decision based on this
 * page. Figures that can only be known after launch are flagged
 * `illustrative` and rendered as placeholders rather than claims.
 */
export type Stat = { value: string; label: string; sub?: string; source: string; sourceUrl: string; illustrative?: boolean };

/** Compact stats under the hero. */
export const HEADLINE_STATS: { value: string; label: string }[] = [
  { value: "US$255.6B", label: "projected global e-pharmacy market by 2030" },
  { value: "20.4%", label: "annual growth rate of that market" },
  { value: "~70%", label: "of Ontario pharmacies are independent or banner, not corporate" },
];

/** Full cards with sources, shown in the market section. */
export const MARKET_STATS: Stat[] = [
  {
    value: "US$255.6B",
    label: "projected global e-pharmacy market by 2030",
    sub: "Growing at a 20.4% compound annual rate — one of the fastest expanding healthcare segments.",
    source: "Grand View Research",
    sourceUrl: "https://www.grandviewresearch.com/press-release/global-e-pharma-market",
  },
  {
    value: "US$2.19B",
    label: "Canadian online pharmacy revenue in 2025",
    sub: "With a further 10–15% growth projected for 2026 as digital-first habits settle in.",
    source: "ECDB, Online Pharmacy Market in Canada",
    sourceUrl: "https://ecdb.com/resources/sample-data/market/ca/health-care",
  },
  {
    value: "~70%",
    label: "of Ontario pharmacies are independent or banner-affiliated",
    sub: "Corporate chains are the minority — but they own the delivery apps patients already use.",
    source: "Canadian Pharmacists Journal — The economics of community pharmacy in Canada",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13446769/",
  },
];

/** Shown as an explicit placeholder until real post-launch data exists. */
export const LOCAL_DEMAND_STAT: Stat = {
  value: "—",
  label: "monthly searches for pharmacy delivery in your area",
  sub: "We'll show your real local demand here once GetMed is live in your city.",
  source: "Available after launch",
  sourceUrl: "#",
  illustrative: true,
};
