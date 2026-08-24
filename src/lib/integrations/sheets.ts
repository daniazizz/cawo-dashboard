// Reads a single cell from a Google Sheet (the 3PL liability balance) via a service account.
import { google } from "googleapis";

export interface SheetsLiability {
  name: string;
  amount: number;
  source: "sheets_3pl";
}

export async function fetch3plLiability(): Promise<SheetsLiability> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.SHEETS_3PL_SPREADSHEET_ID;
  const cellRange = process.env.SHEETS_3PL_CELL_RANGE;

  if (!clientEmail || !privateKey || !spreadsheetId || !cellRange) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, SHEETS_3PL_SPREADSHEET_ID, or SHEETS_3PL_CELL_RANGE environment variables"
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: cellRange,
  });

  const rawValue = response.data.values?.[0]?.[0];
  const amount = typeof rawValue === "string" ? parseFloat(rawValue.replace(/[^0-9.-]/g, "")) : Number(rawValue);

  return {
    name: "3PL Balance",
    amount: Number.isFinite(amount) ? amount : 0,
    source: "sheets_3pl",
  };
}
