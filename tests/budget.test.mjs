import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { AccountManager } from '../dist/services/AccountManager.js';
import { TransactionType } from '../dist/types.js';
import { parseAmount, validateAmount, validateDate, validateText } from '../dist/utils/validation.js';
import { accountToCsv } from '../dist/utils/csv.js';

const input = (type, amountInKopecks) => ({
  type, amountInKopecks, date: '2026-10-19', category: 'Покупки', description: '',
});

test('счета имеют уникальные ID, одинаковые названия допустимы', () => {
  const manager = new AccountManager();
  const first = manager.createAccount('Карта');
  const second = manager.createAccount('Карта');
  assert.notEqual(first.id, second.id);
  assert.equal(manager.getAccounts().length, 2);
  assert.equal(manager.getAccount(first.id), first);
});

test('доход, расход и удаление пересчитывают баланс; счета независимы', () => {
  const manager = new AccountManager();
  const first = manager.createAccount('Карта');
  const second = manager.createAccount('Наличные');
  first.addTransaction(input(TransactionType.Income, 100000));
  const expense = first.addTransaction(input(TransactionType.Expense, 25050));
  assert.equal(first.getBalance(), 74950);
  assert.equal(second.getTransactions().length, 0);
  first.deleteTransaction(expense.id);
  assert.equal(first.getBalance(), 100000);
  assert.throws(() => first.deleteTransaction(expense.id), /не найдена/);
});

test('удаление счёта очищает его операции и не затрагивает соседний счёт', () => {
  const manager = new AccountManager();
  const first = manager.createAccount('Карта');
  const second = manager.createAccount('Наличные');
  first.addTransaction(input(TransactionType.Income, 500));
  manager.deleteAccount(first.id);
  assert.equal(first.getTransactions().length, 0);
  assert.throws(() => manager.getAccount(first.id), /не найден/);
  assert.equal(manager.getAccount(second.id), second);
});

test('суммы: копейки, запятая, точка, недопустимые значения', () => {
  assert.equal(parseAmount('250,50'), 25050);
  assert.equal(parseAmount('0.29'), 29);
  assert.equal(parseAmount('100000000'), 10000000000);
  for (const value of ['', '0', '-10', '1.001', 'NaN', 'Infinity', '1e3', '100000001']) {
    assert.notEqual(validateAmount(value), true, value);
    assert.throws(() => parseAmount(value));
  }
});

test('даты: реальный календарь и високосные годы', () => {
  for (const value of ['2024-02-29', '2026-10-19']) assert.equal(validateDate(value), true);
  for (const value of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '19.10.2026', '']) {
    assert.notEqual(validateDate(value), true, value);
  }
});

test('пустые названия и неверные данные отклоняются даже вне CLI', () => {
  const manager = new AccountManager();
  assert.notEqual(validateText('   '), true);
  assert.throws(() => manager.createAccount('   '));
  const account = manager.createAccount('Карта');
  assert.throws(() => account.addTransaction(input(TransactionType.Income, -1)));
  assert.throws(() => account.addTransaction({ ...input(TransactionType.Income, 100), date: '2026-02-30' }));
});

test('копейки суммируются без дробной погрешности; допускается отрицательный баланс', () => {
  const account = new AccountManager().createAccount('Карта');
  account.addTransaction(input(TransactionType.Income, parseAmount('0.10')));
  account.addTransaction(input(TransactionType.Income, parseAmount('0.20')));
  assert.equal(account.getBalance(), 30);
  account.addTransaction(input(TransactionType.Expense, 50));
  assert.equal(account.getBalance(), -20);
});

test('CSV: UTF-8 BOM, заголовок, кавычки, запятые, точность суммы', () => {
  const account = new AccountManager().createAccount('Карта, основная');
  account.addTransaction({ ...input(TransactionType.Expense, 25050), description: 'Кофе, "большой"' });
  const csv = accountToCsv(account);
  assert.ok(csv.startsWith('\uFEFF"account_id"'));
  assert.ok(csv.includes('"Карта, основная"'));
  assert.ok(csv.includes('"Кофе, ""большой"""'));
  assert.ok(csv.includes('"250.50"'));
  assert.equal(csv.split('\r\n').length, 3);
});

test('экспорт создаёт разные файлы; пустой счёт содержит только заголовок', async () => {
  const manager = new AccountManager();
  const account = manager.createAccount('Пустой');
  const paths = [];
  try {
    paths.push(await manager.exportAccount(account.id));
    paths.push(await manager.exportAccount(account.id));
    assert.notEqual(paths[0], paths[1]);
    const content = await readFile(paths[0], 'utf8');
    assert.equal(content, accountToCsv(account));
    assert.equal(content.split('\r\n').length, 2);
  } finally {
    for (const path of paths) await unlink(path);
  }
});
