import * as XLSX from "xlsx";
import { Company } from "../types/company";

export const parseExcel = async (file: File): Promise<Company[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(sheet);

  return json.map((row) => ({
    companyName: row["Company Name"],
    companySymbol: row["Company Symbol"],
    amount: Number(row["Amount"]),
  }));
};
