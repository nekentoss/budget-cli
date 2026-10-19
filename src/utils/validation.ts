import type { ValidationResult } from "../types.js";

export function validateText(value: string, maxLength: number = 60): ValidationResult {
  const text: string = value.trim();
  if (text.length === 0) return "Поле не должно быть пустым.";
  if (text.length > maxLength) return `Максимум ${maxLength} символов.`;
  if (/[\u0000-\u001f\u007f]/u.test(text)) return "Уберите управляющие символы.";
  return true;
}

export function validateDescription(value: string): ValidationResult {
  return value.trim() === "" ? true : validateText(value, 200);
}

export function validateAmount(value: string): ValidationResult {
  const text: string = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/u.test(text)) {
    return "Введите положительную сумму, например 250 или 250,50 (до двух знаков после запятой).";
  }
  const kopecks: number = Math.round(Number(text.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(kopecks) || kopecks <= 0 || kopecks > 100_000_000_00) {
    return "Сумма должна быть от 0,01 до 100 000 000 рублей.";
  }
  return true;
}

export function parseAmount(value: string): number {
  const result: ValidationResult = validateAmount(value);
  if (result !== true) throw new Error(result);
  return Math.round(Number(value.trim().replace(",", ".")) * 100);
}

export function validateDate(value: string): ValidationResult {
  const text: string = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text)) return "Введите дату в формате ГГГГ-ММ-ДД.";
  const year: number = Number(text.slice(0, 4));
  if (year < 1900 || year > 2100) return "Допустимы годы от 1900 до 2100.";
  const date: Date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    return "Такой даты не существует.";
  }
  return true;
}

export function requireValid(result: ValidationResult): void {
  if (result !== true) throw new Error(result);
}

export function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(kopecks / 100);
}
