import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Account } from "../models/Account.js";
import { accountToCsv } from "../utils/csv.js";

export class AccountManager {
  private accounts: Account[] = [];

  public getAccounts(): readonly Account[] {
    return [...this.accounts];
  }

  public createAccount(name: string): Account {
    const account: Account = new Account(name);
    this.accounts.push(account);
    return account;
  }

  public getAccount(id: string): Account {
    const account: Account | undefined = this.accounts.find((item: Account): boolean => item.id === id);
    if (account === undefined) throw new Error("Счёт не найден.");
    return account;
  }

  public deleteAccount(id: string): void {
    const account: Account = this.getAccount(id);
    account.clearTransactions();
    this.accounts = this.accounts.filter((item: Account): boolean => item.id !== id);
  }

  public async exportAccount(id: string): Promise<string> {
    const account: Account = this.getAccount(id);
    const directory: string = resolve("exports");
    await mkdir(directory, { recursive: true });
    const filename: string = resolve(directory, `account-${account.id}-${randomUUID()}.csv`);
    await writeFile(filename, accountToCsv(account), { encoding: "utf8", flag: "wx" });
    return filename;
  }
}
