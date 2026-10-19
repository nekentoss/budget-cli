import { ApplicationController } from "./controllers/ApplicationController.js";
import { AccountManager } from "./services/AccountManager.js";

const manager: AccountManager = new AccountManager();
const application: ApplicationController = new ApplicationController(manager);

application.run().catch((error: unknown): void => {
  if (error instanceof Error && error.name === "ExitPromptError") {
    console.log("\nПрограмма остановлена пользователем.");
    return;
  }
  console.error(error instanceof Error ? error.message : "Не удалось запустить приложение.");
  process.exitCode = 1;
});
