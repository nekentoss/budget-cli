export enum TransactionType {
  Income = "income",
  Expense = "expense",
}

export type ValidationResult = true | string;
export type MainAction = "open" | "create" | "exit";
export type AccountAction = "add" | "deleteTransaction" | "export" | "deleteAccount" | "back";

export interface TransactionInput {
  type: TransactionType;
  amountInKopecks: number;
  date: string;
  category: string;
  description: string;
}

export interface ITransaction extends Readonly<TransactionInput> {
  readonly id: string;
}

export interface IAccount {
  readonly id: string;
  readonly name: string;
  getTransactions(): readonly ITransaction[];
  getBalance(): number;
  addTransaction(input: TransactionInput): ITransaction;
  deleteTransaction(id: string): void;
}
