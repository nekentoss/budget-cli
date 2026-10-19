import { randomUUID } from "node:crypto";
import { TransactionType } from "../types.js";
import type { ITransaction, TransactionInput } from "../types.js";
import { requireValid, validateDate, validateDescription, validateText } from "../utils/validation.js";

export class Transaction implements ITransaction {
  public readonly id: string;
  public readonly type: TransactionType;
  public readonly amountInKopecks: number;
  public readonly date: string;
  public readonly category: string;
  public readonly description: string;

  public constructor(input: TransactionInput) {
    if (!Number.isSafeInteger(input.amountInKopecks) || input.amountInKopecks <= 0 || input.amountInKopecks > 100_000_000_00) {
      throw new Error("Некорректная сумма транзакции.");
    }
    if (input.type !== TransactionType.Income && input.type !== TransactionType.Expense) {
      throw new Error("Неизвестный тип транзакции.");
    }
    requireValid(validateDate(input.date));
    requireValid(validateText(input.category));
    requireValid(validateDescription(input.description));
    this.id = randomUUID();
    this.type = input.type;
    this.amountInKopecks = input.amountInKopecks;
    this.date = input.date.trim();
    this.category = input.category.trim();
    this.description = input.description.trim();
  }
}
