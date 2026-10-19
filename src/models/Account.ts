import { randomUUID } from "node:crypto";
import { Transaction } from "./Transaction.js";
import { TransactionType } from "../types.js";
import type { IAccount, ITransaction, TransactionInput } from "../types.js";
import { requireValid, validateText } from "../utils/validation.js";

export class Account implements IAccount {
  public readonly id: string;
  public readonly name: string;
  private transactions: Transaction[] = [];

  public constructor(name: string) {
    requireValid(validateText(name));
    this.id = randomUUID();
    this.name = name.trim();
  }

  public getTransactions(): readonly ITransaction[] {
    return [...this.transactions];
  }

  public getBalance(): number {
    return this.transactions.reduce((balance: number, transaction: Transaction): number => {
      return balance + (transaction.type === TransactionType.Income ? transaction.amountInKopecks : -transaction.amountInKopecks);
    }, 0);
  }

  public addTransaction(input: TransactionInput): ITransaction {
    const transaction: Transaction = new Transaction(input);
    const change: number = transaction.type === TransactionType.Income ? transaction.amountInKopecks : -transaction.amountInKopecks;
    if (!Number.isSafeInteger(this.getBalance() + change)) throw new Error("Баланс слишком большой.");
    this.transactions.push(transaction);
    return transaction;
  }

  public deleteTransaction(id: string): void {
    const index: number = this.transactions.findIndex((transaction: Transaction): boolean => transaction.id === id);
    if (index === -1) throw new Error("Транзакция не найдена.");
    this.transactions.splice(index, 1);
  }

  public clearTransactions(): void {
    this.transactions = [];
  }
}
