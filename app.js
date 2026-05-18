const countryByMarketplace = {
  "amazon.de": "DE",
  "amazon.fr": "FR",
  "amazon.it": "IT",
  "amazon.es": "ES",
  "amazon.nl": "NL",
  "amazon.pl": "PL",
  "amazon.com.be": "BE",
  "amazon.be": "BE",
};

const countryLabels = {
  BE: "Бельгія",
  DE: "Німеччина",
  ES: "Іспанія",
  FR: "Франція",
  IT: "Італія",
  NL: "Нідерланди",
  PL: "Польща",
};

const monthNames = {
  january: ["Січень", 1],
  jan: ["Січень", 1],
  february: ["Лютий", 2],
  feb: ["Лютий", 2],
  march: ["Березень", 3],
  mar: ["Березень", 3],
  april: ["Квітень", 4],
  apr: ["Квітень", 4],
  may: ["Травень", 5],
  june: ["Червень", 6],
  jun: ["Червень", 6],
  july: ["Липень", 7],
  jul: ["Липень", 7],
  august: ["Серпень", 8],
  aug: ["Серпень", 8],
  september: ["Вересень", 9],
  sep: ["Вересень", 9],
  october: ["Жовтень", 10],
  oct: ["Жовтень", 10],
  november: ["Листопад", 11],
  nov: ["Листопад", 11],
  december: ["Грудень", 12],
  dec: ["Грудень", 12],
};

const plNumeric = [
  "Units",
  "Refunds",
  "Sales",
  "Promo",
  "Ads",
  "Sponsored products (PPC)",
  "Sponsored Display",
  "Sponsored brands (HSA)",
  "Sponsored Brands Video",
  "Google ads",
  "Facebook ads",
  "% Refunds",
  "Sellable Quota",
  "Refund сost",
  "Amazon fees",
  "Cost of Goods",
  "VAT",
  "Shipping",
  "Gross profit",
  "Net profit",
  "Estimated payout",
  "Expenses",
  "Margin",
  "ROI",
  "BSR",
  "Real ACOS",
  "Sessions",
  "Unit Session Percentage",
  "Average Sales Price",
];

const ppcNumeric = [
  "Sales(EUR)",
  "ROAS",
  "Conversion rate",
  "Impressions",
  "Clicks",
  "CTR",
  "Spend(EUR)",
  "CPC(EUR)",
  "Orders",
  "ACOS",
  "NTB orders",
  "% of orders NTB",
  "NTB sales(EUR)",
  "% of sales NTB",
  "Viewable impressions",
];

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

const state = {
  source: null,
  data: null,
  months: [],
  currentMonth: null,
  previousMonth: null,
  summaryMode: "local",
};

function parseMonth(filename) {
  const normalized = filename.toLowerCase().replaceAll("__", "_");
  const year = Number(normalized.match(/20\d{2}/)?.[0] || "2026");
  for (const [token, [label, order]] of Object.entries(monthNames)) {
    if (normalized.includes(token)) {
      const key = `${year}-${String(order).padStart(2, "0")}`;
      return { key, label: `${label} ${year}`, year, order };
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  let text = String(value).trim().replace("\ufeff", "");
  if (!text || text === "-") return null;
  text = text.replace(/\u00a0|\u202f|\s/g, "").replace("%", "");
  if (text.includes(",") && text.includes(".")) text = text.replaceAll(".", "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    const next = cleanText[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item.trim()));
}

function toObjects(rows, numericColumns) {
  const headers = rows[0].map((header) => header.replace("\ufeff", "").trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      const value = row[index] ?? "";
      record[header] = numericColumns.includes(header) ? parseNumber(value) : value.trim();
    });
    return record;
  });
}

function value(row, key) {
  return row[key] ?? 0;
}

function pctChange(current, previous) {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function weightedMargin(netProfit, sales) {
  return sales ? (netProfit / sales) * 100 : 0;
}

function formatMoney(value) {
  return money.format(value || 0);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${number.format(value)}%`;
}

function formatSignedMoney(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(value || 0))}`;
}

function formatSignedNumber(value, suffix = "") {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${number.format(value || 0)}${suffix}`;
}

function deltaClass(value, inverse = false) {
  const good = inverse ? value <= 0 : value >= 0;
  return good ? "good" : "bad";
}

function textClass(value, inverse = false) {
  return deltaClass(value, inverse) === "good" ? "good-text" : "bad-text";
}

function productShortName(name) {
  const cleaned = (name || "").replace(/\s+/g, " ").replace(/\s*COG:\s*.*$/i, "").trim();
  return cleaned.length > 88 ? `${cleaned.slice(0, 85).trim()}...` : cleaned;
}

function sumRows(rows, fields) {
  return rows.reduce((totals, row) => {
    fields.forEach((field) => {
      totals[field] = (totals[field] || 0) + value(row, field);
    });
    return totals;
  }, {});
}

function splitPpcProduct(productKey) {
  const [asin, sku = ""] = (productKey || "").split(/-(.*)/s);
  return { asin, sku };
}

function buildData(files) {
  const countryRows = [];
  const productRows = [];
  const ppcRows = [];
  const months = new Map();
  const sourceFiles = { pl: [], ppc: [], skipped: [] };

  files.forEach(({ name, text }) => {
    const month = parseMonth(name);
    if (!month) {
      sourceFiles.skipped.push(name);
      return;
    }
    months.set(month.key, month);
    const firstLine = text.split(/\r?\n/)[0] || "";
    if (firstLine.includes("Marketplace / Product")) {
      sourceFiles.pl.push(name);
      readPlFile(name, text, month.key, countryRows, productRows);
    } else if (firstLine.includes('"Products"') || firstLine.startsWith("Products")) {
      sourceFiles.ppc.push(name);
      readPpcFile(name, text, month.key, ppcRows);
    } else {
      sourceFiles.skipped.push(name);
    }
  });

  const sortedMonths = [...months.values()].sort((a, b) => a.year - b.year || a.order - b.order);
  return {
    sourceFiles,
    months: sortedMonths,
    countryRows,
    productRows,
    ppcRows,
  };
}

function readPlFile(name, text, monthKey, countryRows, productRows) {
  let currentCountry = null;
  const rows = toObjects(parseCsv(text, ";"), plNumeric);
  rows.forEach((row) => {
    const marketplace = row["Marketplace / Product"] || "";
    const asin = row.ASIN || "";
    const sku = row.SKU || "";
    if (!asin && !sku && marketplace.toLowerCase().startsWith("amazon.")) {
      currentCountry = countryByMarketplace[marketplace.toLowerCase()] || "OTHER";
      countryRows.push({
        ...row,
        month: monthKey,
        country: currentCountry,
        countryLabel: countryLabels[currentCountry] || currentCountry,
      });
    } else if (asin || sku) {
      productRows.push({
        ...row,
        month: monthKey,
        country: currentCountry || "OTHER",
        countryLabel: countryLabels[currentCountry] || currentCountry || "OTHER",
        name: marketplace,
        shortName: productShortName(marketplace),
        asin,
        sku,
        key: `${asin}|${sku}`,
      });
    }
  });
}

function readPpcFile(name, text, monthKey, ppcRows) {
  const country = name.slice(0, 2).toUpperCase();
  const rows = toObjects(parseCsv(text, ","), ppcNumeric);
  rows.forEach((row) => {
    const { asin, sku } = splitPpcProduct(row.Products);
    ppcRows.push({
      ...row,
      month: monthKey,
      country,
      countryLabel: countryLabels[country] || country,
      asin,
      sku,
    });
  });
}

function compareData(raw, currentMonth, previousMonth) {
  const countries = buildCountries(raw.countryRows, raw.ppcRows);
  const portfolio = buildPortfolio(raw.countryRows, currentMonth, previousMonth);
  const countryComparisons = compareCountries(countries, currentMonth, previousMonth);
  const productComparisons = compareProducts(raw.productRows, currentMonth, previousMonth);
  const aiInsights = buildAiInsights(portfolio, countryComparisons, productComparisons);
  return {
    ...raw,
    portfolio,
    countries,
    countryComparisons,
    productComparisons,
    aiInsights,
  };
}

function buildCountries(countryRows, ppcRows) {
  const ppc = new Map();
  ppcRows.forEach((row) => {
    const key = `${row.month}|${row.country}`;
    const totals = ppc.get(key) || { ppcSales: 0, ppcSpend: 0, ppcOrders: 0, clicks: 0, impressions: 0 };
    totals.ppcSales += value(row, "Sales(EUR)");
    totals.ppcSpend += value(row, "Spend(EUR)");
    totals.ppcOrders += value(row, "Orders");
    totals.clicks += value(row, "Clicks");
    totals.impressions += value(row, "Impressions");
    ppc.set(key, totals);
  });

  return countryRows.map((row) => {
    const ppcTotals = ppc.get(`${row.month}|${row.country}`) || {};
    const sales = value(row, "Sales");
    const netProfit = value(row, "Net profit");
    return {
      month: row.month,
      country: row.country,
      countryLabel: row.countryLabel,
      sales,
      netProfit,
      margin: weightedMargin(netProfit, sales),
      units: value(row, "Units"),
      refunds: value(row, "Refunds"),
      sessions: value(row, "Sessions"),
      ads: value(row, "Ads"),
      roi: value(row, "ROI"),
      ppcSales: ppcTotals.ppcSales || 0,
      ppcSpend: ppcTotals.ppcSpend || 0,
      ppcOrders: ppcTotals.ppcOrders || 0,
      ppcAcos: ppcTotals.ppcSales ? ((ppcTotals.ppcSpend || 0) / ppcTotals.ppcSales) * 100 : 0,
      ppcRoas: ppcTotals.ppcSpend ? (ppcTotals.ppcSales || 0) / ppcTotals.ppcSpend : 0,
    };
  });
}

function buildPortfolio(countryRows, currentMonth, previousMonth) {
  const fields = ["Sales", "Net profit", "Units", "Refunds", "Sessions", "Ads", "Amazon fees", "Cost of Goods", "Gross profit"];
  const byMonth = {};
  [previousMonth, currentMonth].forEach((month) => {
    const totals = sumRows(countryRows.filter((row) => row.month === month), fields);
    byMonth[month] = {
      month,
      sales: totals.Sales || 0,
      netProfit: totals["Net profit"] || 0,
      margin: weightedMargin(totals["Net profit"] || 0, totals.Sales || 0),
      units: totals.Units || 0,
      refunds: totals.Refunds || 0,
      sessions: totals.Sessions || 0,
      ads: totals.Ads || 0,
      amazonFees: totals["Amazon fees"] || 0,
      cogs: totals["Cost of Goods"] || 0,
      grossProfit: totals["Gross profit"] || 0,
    };
  });

  const current = byMonth[currentMonth];
  const previous = byMonth[previousMonth];
  return {
    current,
    previous,
    comparison: {
      salesDelta: current.sales - previous.sales,
      salesPct: pctChange(current.sales, previous.sales),
      netProfitDelta: current.netProfit - previous.netProfit,
      netProfitPct: pctChange(current.netProfit, previous.netProfit),
      marginDelta: current.margin - previous.margin,
      unitsDelta: current.units - previous.units,
      unitsPct: pctChange(current.units, previous.units),
      adsDelta: current.ads - previous.ads,
      adsPct: pctChange(current.ads, previous.ads),
    },
  };
}

function compareCountries(countries, currentMonth, previousMonth) {
  const byKey = new Map(countries.map((row) => [`${row.country}|${row.month}`, row]));
  return [...new Set(countries.map((row) => row.country))].sort().map((country) => {
    const current = byKey.get(`${country}|${currentMonth}`) || {};
    const previous = byKey.get(`${country}|${previousMonth}`) || {};
    return {
      country,
      countryLabel: countryLabels[country] || country,
      salesPrevious: previous.sales || 0,
      salesCurrent: current.sales || 0,
      salesDelta: (current.sales || 0) - (previous.sales || 0),
      salesPct: pctChange(current.sales || 0, previous.sales || 0),
      netProfitPrevious: previous.netProfit || 0,
      netProfitCurrent: current.netProfit || 0,
      netProfitDelta: (current.netProfit || 0) - (previous.netProfit || 0),
      netProfitPct: pctChange(current.netProfit || 0, previous.netProfit || 0),
      marginPrevious: previous.margin || 0,
      marginCurrent: current.margin || 0,
      marginDelta: (current.margin || 0) - (previous.margin || 0),
      unitsDelta: (current.units || 0) - (previous.units || 0),
      ppcSpendCurrent: current.ppcSpend || 0,
      ppcAcosCurrent: current.ppcAcos || 0,
      ppcRoasCurrent: current.ppcRoas || 0,
    };
  });
}

function compareProducts(productRows, currentMonth, previousMonth) {
  const groups = new Map();
  productRows.forEach((row) => {
    const item = groups.get(row.key) || { rows: [], name: row.shortName, asin: row.asin, sku: row.sku, country: row.country };
    item.rows.push(row);
    groups.set(row.key, item);
  });

  return [...groups.values()].map((item) => {
    const currentRows = item.rows.filter((row) => row.month === currentMonth);
    const previousRows = item.rows.filter((row) => row.month === previousMonth);
    const current = sumRows(currentRows, ["Sales", "Net profit", "Units", "Sessions", "Ads"]);
    const previous = sumRows(previousRows, ["Sales", "Net profit", "Units", "Sessions", "Ads"]);
    return {
      name: item.name,
      asin: item.asin,
      sku: item.sku,
      country: item.country,
      salesPrevious: previous.Sales || 0,
      salesCurrent: current.Sales || 0,
      salesDelta: (current.Sales || 0) - (previous.Sales || 0),
      salesPct: pctChange(current.Sales || 0, previous.Sales || 0),
      netProfitPrevious: previous["Net profit"] || 0,
      netProfitCurrent: current["Net profit"] || 0,
      netProfitDelta: (current["Net profit"] || 0) - (previous["Net profit"] || 0),
      netProfitPct: pctChange(current["Net profit"] || 0, previous["Net profit"] || 0),
      marginPrevious: weightedMargin(previous["Net profit"] || 0, previous.Sales || 0),
      marginCurrent: weightedMargin(current["Net profit"] || 0, current.Sales || 0),
      marginDelta: weightedMargin(current["Net profit"] || 0, current.Sales || 0) - weightedMargin(previous["Net profit"] || 0, previous.Sales || 0),
      unitsDelta: (current.Units || 0) - (previous.Units || 0),
      sessionsDelta: (current.Sessions || 0) - (previous.Sessions || 0),
      adsDelta: (current.Ads || 0) - (previous.Ads || 0),
      attentionScore: attentionScore(previous, current),
    };
  }).filter((row) => row.salesCurrent || row.salesPrevious || row.netProfitCurrent || row.netProfitPrevious);
}

function attentionScore(previous, current) {
  let score = 0;
  const profitDrop = (previous["Net profit"] || 0) - (current["Net profit"] || 0);
  const salesDrop = (previous.Sales || 0) - (current.Sales || 0);
  if (profitDrop > 0) score += profitDrop * 1.2;
  if (salesDrop > 0) score += salesDrop * 0.3;
  if ((current["Net profit"] || 0) < 0) score += Math.abs(current["Net profit"]) * 2;
  if ((current.Ads || 0) < (previous.Ads || 0) && (current.Sales || 0) < (previous.Sales || 0)) score += salesDrop * 0.15;
  return Math.round(score * 100) / 100;
}

function buildAiInsights(portfolio, countryComparisons, productComparisons) {
  const current = portfolio.current;
  const comparison = portfolio.comparison;
  const drivers = [...countryComparisons].sort((a, b) => b.netProfitDelta - a.netProfitDelta).slice(0, 2);
  const risks = [...countryComparisons].sort((a, b) => a.netProfitDelta - b.netProfitDelta).slice(0, 2);
  const focusProducts = [...productComparisons].sort((a, b) => b.attentionScore - a.attentionScore).slice(0, 5);
  const salesWord = comparison.salesDelta >= 0 ? "зросли" : "просіли";
  const profitWord = comparison.netProfitDelta >= 0 ? "зріс" : "просів";
  const bestDriver = drivers[0];
  const biggestRisk = risks[0];
  const narrative = [
    `Поточний місяць закрився з продажами ${formatMoney(current.sales)}, чистим прибутком ${formatMoney(current.netProfit)} і маржею ${number.format(current.margin)}%.`,
    `До попереднього місяця продажі змінилися на ${formatSignedMoney(comparison.salesDelta)}, чистий прибуток на ${formatSignedMoney(comparison.netProfitDelta)}, маржа на ${formatSignedNumber(comparison.marginDelta, " п.п.")}.`,
    bestDriver ? `Найкращий внесок у прибуток дала країна ${bestDriver.countryLabel}: ${formatSignedMoney(bestDriver.netProfitDelta)} MoM.` : "",
    biggestRisk ? `Найбільша зона ризику зараз ${biggestRisk.countryLabel}: ${formatSignedMoney(biggestRisk.netProfitDelta)} MoM.` : "",
  ].filter(Boolean).join(" ");

  return {
    headline: `У поточному місяці продажі ${salesWord}, а чистий прибуток ${profitWord} відносно попереднього.`,
    narrative,
    focusProducts: focusProducts.map(focusProductReason),
  };
}

function buildClaudePayload() {
  const currentLabel = state.months.find((month) => month.key === state.currentMonth)?.label || "поточний місяць";
  const previousLabel = state.months.find((month) => month.key === state.previousMonth)?.label || "попередній місяць";
  const countryRows = state.data.countryComparisons.map((row) => ({
    country: row.countryLabel,
    sales: Math.round(row.salesCurrent),
    salesDelta: Math.round(row.salesDelta),
    netProfit: Math.round(row.netProfitCurrent),
    netProfitDelta: Math.round(row.netProfitDelta),
    margin: Number(row.marginCurrent.toFixed(1)),
    marginDelta: Number(row.marginDelta.toFixed(1)),
    ppcAcos: Number(row.ppcAcosCurrent.toFixed(1)),
  }));
  const productRows = [...state.data.productComparisons]
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 8)
    .map((row) => ({
      asin: row.asin,
      sku: row.sku,
      country: row.country,
      name: row.name,
      sales: Math.round(row.salesCurrent),
      salesDelta: Math.round(row.salesDelta),
      netProfit: Math.round(row.netProfitCurrent),
      netProfitDelta: Math.round(row.netProfitDelta),
      margin: Number(row.marginCurrent.toFixed(1)),
    }));
  return {
    currentMonth: currentLabel,
    previousMonth: previousLabel,
    portfolio: {
      sales: Math.round(state.data.portfolio.current.sales),
      salesDelta: Math.round(state.data.portfolio.comparison.salesDelta),
      netProfit: Math.round(state.data.portfolio.current.netProfit),
      netProfitDelta: Math.round(state.data.portfolio.comparison.netProfitDelta),
      margin: Number(state.data.portfolio.current.margin.toFixed(1)),
      marginDelta: Number(state.data.portfolio.comparison.marginDelta.toFixed(1)),
    },
    countries: countryRows,
    focusProducts: productRows,
  };
}

async function updateClaudeSummary() {
  const endpoint = window.CLAUDE_PROXY_URL;
  const status = document.getElementById("claudeStatus");
  if (!endpoint) {
    status.textContent = "Claude endpoint не налаштовано";
    return;
  }
  if (!state.data) {
    status.textContent = "Спочатку завантажте CSV-файли";
    return;
  }
  status.textContent = "Claude аналізує дані...";
  document.getElementById("claudeSummaryButton").disabled = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildClaudePayload()),
    });
    if (!response.ok) throw new Error(`Claude proxy returned ${response.status}`);
    const result = await response.json();
    if (result.headline) document.getElementById("aiHeadline").textContent = result.headline;
    if (result.summary) document.getElementById("aiNarrative").textContent = result.summary;
    status.textContent = "Оновлено через Claude";
    state.summaryMode = "claude";
  } catch {
    status.textContent = "Claude недоступний, показано локальне резюме";
    renderAI();
  } finally {
    document.getElementById("claudeSummaryButton").disabled = false;
  }
}

function focusProductReason(row) {
  const reasons = [];
  if (row.netProfitCurrent < 0) reasons.push(`у поточному місяці мінус ${formatMoney(Math.abs(row.netProfitCurrent))}`);
  if (row.netProfitDelta < 0) reasons.push(`прибуток змінився на ${formatSignedMoney(row.netProfitDelta)}`);
  if (row.salesDelta < 0) reasons.push(`продажі ${formatSignedMoney(row.salesDelta)}`);
  if (row.marginDelta < -3) reasons.push(`маржа ${formatSignedNumber(row.marginDelta, " п.п.")}`);
  if (!reasons.length) reasons.push("високий оборот і помітна зміна місяць до місяця");
  return {
    name: row.name,
    asin: row.asin,
    sku: row.sku,
    country: row.country,
    salesCurrent: row.salesCurrent,
    netProfitCurrent: row.netProfitCurrent,
    netProfitDelta: row.netProfitDelta,
    marginCurrent: row.marginCurrent,
    reason: reasons.join("; "),
  };
}

function render() {
  renderPeriods();
  renderSource();
  renderKpis();
  renderAI();
  renderCountries();
  renderTopProducts();
  renderWatchlist();
}

function renderPeriods() {
  const current = document.getElementById("currentMonth");
  const previous = document.getElementById("previousMonth");
  const options = state.months.map((month) => `<option value="${month.key}">${month.label}</option>`).join("");
  if (current.innerHTML !== options) current.innerHTML = options;
  if (previous.innerHTML !== options) previous.innerHTML = options;
  current.value = state.currentMonth;
  previous.value = state.previousMonth;
  const currentLabel = state.months.find((month) => month.key === state.currentMonth)?.label || "поточний";
  const previousLabel = state.months.find((month) => month.key === state.previousMonth)?.label || "попередній";
  document.getElementById("periodTitle").textContent = `${currentLabel} проти ${previousLabel}`;
}

function renderSource() {
  const { sourceFiles } = state.source;
  document.getElementById("sourceNote").textContent = `Оброблено ${sourceFiles.pl.length} P&L-файли та ${sourceFiles.ppc.length} PPC-файлів. Дані залишаються у браузері.`;
  document.getElementById("uploadStatus").textContent = `Завантажено ${sourceFiles.pl.length + sourceFiles.ppc.length} файлів.`;
}

function renderKpis() {
  const { current, comparison } = state.data.portfolio;
  const kpis = [
    ["Продажі", formatMoney(current.sales), `${formatSignedMoney(comparison.salesDelta)} (${formatPercent(comparison.salesPct)})`, comparison.salesDelta],
    ["Чистий прибуток", formatMoney(current.netProfit), `${formatSignedMoney(comparison.netProfitDelta)} (${formatPercent(comparison.netProfitPct)})`, comparison.netProfitDelta],
    ["Маржа", formatPercent(current.margin), `${formatSignedNumber(comparison.marginDelta, " п.п.")} до попереднього`, comparison.marginDelta],
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(([label, valueText, delta, rawDelta]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${valueText}</strong>
      <div class="delta ${deltaClass(rawDelta)}">${delta}</div>
    </article>
  `).join("");
}

function renderAI() {
  document.getElementById("aiHeadline").textContent = state.data.aiInsights.headline;
  document.getElementById("aiNarrative").textContent = state.data.aiInsights.narrative;
  const hasClaude = Boolean(window.CLAUDE_PROXY_URL);
  document.getElementById("claudeSummaryButton").disabled = !hasClaude;
  document.getElementById("claudeStatus").textContent = hasClaude ? "Claude summary доступний" : "Claude endpoint не налаштовано";
}

function renderCountries() {
  const metric = document.getElementById("countryMetric").value;
  const rows = [...state.data.countryComparisons].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  document.getElementById("countryRows").innerHTML = rows.map((row) => `
    <tr>
      <td><div class="country-name"><span class="flag">${row.country}</span>${row.countryLabel}</div></td>
      <td>${formatMoney(row.salesCurrent)}</td>
      <td class="${textClass(row.salesDelta)}">${formatSignedMoney(row.salesDelta)}</td>
      <td>${formatMoney(row.netProfitCurrent)}</td>
      <td class="${textClass(row.netProfitDelta)}">${formatSignedMoney(row.netProfitDelta)}</td>
      <td>${formatPercent(row.marginCurrent)} <span class="${textClass(row.marginDelta)}">(${formatSignedNumber(row.marginDelta, " п.п.")})</span></td>
      <td>${formatPercent(row.ppcAcosCurrent)}</td>
    </tr>
  `).join("");
}

function renderTopProducts() {
  const metric = document.getElementById("topMetric").value;
  const rows = [...state.data.productComparisons].sort((a, b) => (b[metric] || 0) - (a[metric] || 0)).slice(0, 8);
  const max = Math.max(...rows.map((row) => Math.abs(row[metric] || 0)), 1);
  document.getElementById("topProducts").innerHTML = rows.map((row, index) => {
    const width = Math.max(4, Math.min(100, (Math.abs(row[metric] || 0) / max) * 100));
    const formatted = metric === "attentionScore" ? number.format(row[metric]) : formatMoney(row[metric]);
    return `
      <article class="rank-item">
        <div class="rank-topline">
          <span class="rank-name">${index + 1}. ${row.name}</span>
          <span>${formatted}</span>
        </div>
        <div class="muted">${row.asin} · ${row.sku || "без SKU"}</div>
        <div class="bar"><span style="width: ${width}%"></span></div>
      </article>
    `;
  }).join("");
}

function renderWatchlist() {
  document.getElementById("watchlist").innerHTML = state.data.aiInsights.focusProducts.map((row) => `
    <article class="watch-card">
      <h3>${row.name}</h3>
      <p>${row.reason}</p>
      <div class="watch-meta">
        <span>${row.asin}</span>
        <span>${row.country}</span>
      </div>
      <div class="watch-meta">
        <span>${formatMoney(row.salesCurrent)} продажі</span>
        <span class="${textClass(row.netProfitDelta)}">${formatSignedMoney(row.netProfitDelta)}</span>
      </div>
    </article>
  `).join("");
}

function applyComparison() {
  if (!state.source || state.currentMonth === state.previousMonth) return;
  state.data = compareData(state.source, state.currentMonth, state.previousMonth);
  state.summaryMode = "local";
  render();
}

async function loadFiles(fileList) {
  const csvFiles = [...fileList].filter((file) => file.name.toLowerCase().endsWith(".csv"));
  const files = await Promise.all(csvFiles.map(async (file) => ({ name: file.name, text: await file.text() })));
  const raw = buildData(files);
  if (raw.months.length < 2 || raw.countryRows.length < 2) {
    document.getElementById("uploadStatus").textContent = "Потрібно завантажити P&L CSV мінімум за два місяці.";
    return;
  }
  state.source = raw;
  state.months = raw.months;
  state.currentMonth = raw.months.at(-1).key;
  state.previousMonth = raw.months.at(-2).key;
  applyComparison();
}

function bindEvents() {
  document.getElementById("fileInput").addEventListener("change", (event) => loadFiles(event.target.files));
  document.getElementById("currentMonth").addEventListener("change", (event) => {
    state.currentMonth = event.target.value;
    applyComparison();
  });
  document.getElementById("previousMonth").addEventListener("change", (event) => {
    state.previousMonth = event.target.value;
    applyComparison();
  });
  document.getElementById("countryMetric").addEventListener("change", renderCountries);
  document.getElementById("topMetric").addEventListener("change", renderTopProducts);
  document.getElementById("claudeSummaryButton").addEventListener("click", updateClaudeSummary);
}

bindEvents();
