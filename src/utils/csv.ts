import type { IAccount, ITransaction } from "../types.js";

function escapeCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function accountToCsv(account: IAccount): string {
  const rows: string[][] = [[
    "account_id", "account_name", "transaction_id", "type", "amount_rub", "date", "category", "description",
  ]];
  for (const transaction of account.getTransactions()) {
    const item: ITransaction = transaction;
    rows.push([
      account.id, account.name, item.id, item.type,
      (item.amountInKopecks / 100).toFixed(2), item.date, item.category, item.description,
    ]);
  }
  // BOM помогает табличным редакторам распознать кириллицу в UTF-8.
  return "\uFEFF" + rows.map((row: string[]): string => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}
