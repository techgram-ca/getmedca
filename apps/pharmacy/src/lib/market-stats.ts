/**
 * Market figures shown on the getting-started page. Every number here is a
 * real, sourced figure. Illustrative placeholders are explicitly flagged and
 * must be replaced with real post-launch data before use in marketing.
 */
export type Stat = { value: string; label: string; source: string; sourceUrl: string; illustrative?: boolean };

export const MARKET_STATS: Stat[] = [
  {
    value: "US$255.6B",
    label: "projected global e-pharmacy market by 2030, growing at 20.4% per year",
    source: "Grand View Research",
    sourceUrl: "https://www.grandviewresearch.com/press-release/global-e-pharma-market",
  },
  {
    value: "US$2.19B",
    label: "Canadian online pharmacy revenue in 2025, with 10–15% growth projected for 2026",
    source: "ECDB, Online Pharmacy Market in Canada",
    sourceUrl: "https://ecdb.com/resources/sample-data/market/ca/health-care",
  },
  {
    value: "~70%",
    label: "of Ontario pharmacies are independent or banner-affiliated rather than corporate — the chains are the minority, but they own the delivery apps",
    source: "Canadian Pharmacists Journal, The economics of community pharmacy in Canada (Part 1)",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13446769/",
  },
  {
    value: "—",
    label: "monthly searches for “pharmacy delivery near me” in your area (real figure shown after launch)",
    source: "Illustrative pre-launch placeholder",
    sourceUrl: "#",
    illustrative: true,
  },
];
