import inquirer from "inquirer";
import { Account } from "../models/Account.js";
import { AccountManager } from "../services/AccountManager.js";
import { TransactionType } from "../types.js";
import type { AccountAction, ITransaction, MainAction, ValidationResult } from "../types.js";
import { formatMoney, parseAmount, validateAmount, validateDate, validateDescription, validateText } from "../utils/validation.js";

interface TransactionAnswers {
  type: TransactionType;
  amount: string;
  date: string;
  category: string;
  description: string;
}

export class ApplicationController {
  public constructor(private readonly manager: AccountManager) {}

  public async run(): Promise<void> {
    let running: boolean = true;
    while (running) {
      console.clear();
      console.log("ЛИЧНЫЕ ФИНАНСЫ\n");
      console.log("Данные хранятся только до выхода. Для выгрузки используйте CSV.\n");
      const accounts: readonly Account[] = this.manager.getAccounts();
      if (accounts.length === 0) console.log("Счетов пока нет.");
      for (const account of accounts) {
        console.log(`${account.name} | ${formatMoney(account.getBalance())} | ID: ${account.id}`);
      }
      try {
        const answer: { action: MainAction } = await inquirer.prompt<{ action: MainAction }>([{
          type: "select", name: "action", message: "Что сделать?", choices: [
            { name: "Открыть счёт", value: "open" },
            { name: "Создать счёт", value: "create" },
            { name: "Выход", value: "exit" },
          ],
        }]);
        switch (answer.action) {
          case "create": await this.createAccount(); break;
          case "open": await this.chooseAccount(); break;
          case "exit":
            running = !(await this.confirm("Выйти? Данные в памяти будут потеряны; CSV-файлы останутся."));
            break;
        }
      } catch (error: unknown) {
        await this.showError(error);
      }
    }
    console.log("Работа завершена.");
  }

  private async pause(): Promise<void> {
    await inquirer.prompt<{ pause: string }>([{ type: "input", name: "pause", message: "Нажмите Enter, чтобы продолжить." }]);
  }

  private async confirm(message: string): Promise<boolean> {
    const answer: { confirmed: boolean } = await inquirer.prompt<{ confirmed: boolean }>([
      { type: "confirm", name: "confirmed", message, default: false },
    ]);
    return answer.confirmed;
  }

  private async showError(error: unknown): Promise<void> {
    if (error instanceof Error && error.name === "ExitPromptError") throw error;
    console.log(`Ошибка: ${error instanceof Error ? error.message : "неизвестная ошибка"}`);
    await this.pause();
  }

  private async createAccount(): Promise<void> {
    const answer: { name: string } = await inquirer.prompt<{ name: string }>([{
      type: "input", name: "name", message: "Название счёта:",
      validate: (value: string): ValidationResult => validateText(value),
    }]);
    const account: Account = this.manager.createAccount(answer.name);
    console.log(`Создан счёт «${account.name}». ID: ${account.id}`);
    await this.pause();
  }

  private async chooseAccount(): Promise<void> {
    const accounts: readonly Account[] = this.manager.getAccounts();
    if (accounts.length === 0) {
      console.log("Сначала создайте счёт.");
      await this.pause();
      return;
    }
    const answer: { id: string } = await inquirer.prompt<{ id: string }>([{
      type: "select", name: "id", message: "Выберите счёт:", choices: [
        ...accounts.map((account: Account): { name: string; value: string } => ({
          name: `${account.name} (${account.id})`, value: account.id,
        })),
        { name: "Назад", value: "back" },
      ],
    }]);
    if (answer.id !== "back") await this.accountMenu(this.manager.getAccount(answer.id));
  }

  private showAccount(account: Account): void {
    console.clear();
    console.log(`Счёт: ${account.name}\nID: ${account.id}\nБаланс: ${formatMoney(account.getBalance())}\n`);
    const transactions: readonly ITransaction[] = account.getTransactions();
    if (transactions.length === 0) console.log("Транзакций пока нет.");
    for (const transaction of transactions) {
      const kind: string = transaction.type === TransactionType.Income ? "Доход" : "Расход";
      console.log(`${transaction.date} | ${kind} | ${formatMoney(transaction.amountInKopecks)} | ${transaction.category}`);
      console.log(`  ID: ${transaction.id} | ${transaction.description || "Без описания"}`);
    }
  }

  private async accountMenu(account: Account): Promise<void> {
    while (true) {
      this.showAccount(account);
      try {
        const answer: { action: AccountAction } = await inquirer.prompt<{ action: AccountAction }>([{
          type: "select", name: "action", message: "Действия со счётом:", choices: [
            { name: "Добавить транзакцию", value: "add" },
            { name: "Удалить транзакцию", value: "deleteTransaction" },
            { name: "Экспортировать в CSV", value: "export" },
            { name: "Удалить счёт", value: "deleteAccount" },
            { name: "Назад", value: "back" },
          ],
        }]);
        switch (answer.action) {
          case "add": await this.addTransaction(account); break;
          case "deleteTransaction": await this.deleteTransaction(account); break;
          case "export":
            console.log(`Файл сохранён: ${await this.manager.exportAccount(account.id)}`);
            await this.pause();
            break;
          case "deleteAccount":
            if (await this.confirm(`Удалить «${account.name}» и все его транзакции?`)) {
              this.manager.deleteAccount(account.id);
              console.log("Счёт и его транзакции удалены.");
              await this.pause();
              return;
            }
            break;
          case "back": return;
        }
      } catch (error: unknown) {
        await this.showError(error);
      }
    }
  }

  private async addTransaction(account: Account): Promise<void> {
    const answer: TransactionAnswers = await inquirer.prompt<TransactionAnswers>([
      { type: "select", name: "type", message: "Тип операции:", choices: [
        { name: "Доход", value: TransactionType.Income },
        { name: "Расход", value: TransactionType.Expense },
      ] },
      { type: "input", name: "amount", message: "Сумма в рублях:", validate: validateAmount },
      { type: "input", name: "date", message: "Дата (ГГГГ-ММ-ДД):", validate: validateDate },
      { type: "input", name: "category", message: "Категория (например, Продукты):",
        validate: (value: string): ValidationResult => validateText(value) },
      { type: "input", name: "description", message: "Описание (можно пропустить):", validate: validateDescription },
    ]);
    account.addTransaction({
      type: answer.type, amountInKopecks: parseAmount(answer.amount), date: answer.date,
      category: answer.category, description: answer.description,
    });
    console.log("Транзакция добавлена.");
    await this.pause();
  }

  private async deleteTransaction(account: Account): Promise<void> {
    const transactions: readonly ITransaction[] = account.getTransactions();
    if (transactions.length === 0) {
      console.log("Нет транзакций для удаления.");
      await this.pause();
      return;
    }
    const answer: { id: string } = await inquirer.prompt<{ id: string }>([{
      type: "select", name: "id", message: "Какую транзакцию удалить?", choices: [
        ...transactions.map((transaction: ITransaction): { name: string; value: string } => ({
          name: `${transaction.date} | ${transaction.type === TransactionType.Income ? "Доход" : "Расход"} | ${formatMoney(transaction.amountInKopecks)} | ${transaction.category} | ${transaction.id}`,
          value: transaction.id,
        })),
        { name: "Назад", value: "back" },
      ],
    }]);
    if (answer.id === "back") return;
    if (await this.confirm("Точно удалить выбранную транзакцию?")) {
      account.deleteTransaction(answer.id);
      console.log("Транзакция удалена.");
      await this.pause();
    }
  }
}
