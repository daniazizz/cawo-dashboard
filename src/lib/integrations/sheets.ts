// Reads a single cell from a Google Sheet (the 3PL liability balance).
// The sheet is shared as "anyone with the link can view", so a plain API key is enough — no service account needed.

export interface SheetsLiability {
  name: string;
  amount: number;
  source: "sheets_3pl";
}

export async function fetch3plLiability(): Promise<SheetsLiability> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.SHEETS_3PL_SPREADSHEET_ID;
  const cellRange = process.env.SHEETS_3PL_CELL_RANGE;

  if (!apiKey || !spreadsheetId || !cellRange) {
    throw new Error(
      "Missing GOOGLE_SHEETS_API_KEY, SHEETS_3PL_SPREADSHEET_ID, or SHEETS_3PL_CELL_RANGE environment variables",
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cellRange)}?key=${apiKey}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Google Sheets API request failed: ${response.status} ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  const json: { values?: string[][] } = await response.json();
  const rawValue = json.values?.[0]?.[0];
  const amount =
    typeof rawValue === "string"
      ? parseFloat(rawValue.replace(/[^0-9.-]/g, ""))
      : Number(rawValue);

  return {
    name: "3PL Balance",
    amount: Number.isFinite(amount) ? amount : 0,
    source: "sheets_3pl",
  };
}
