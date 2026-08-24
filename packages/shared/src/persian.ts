/**
 * Persian text utilities shared by the search engine (API) and the UI (web).
 *
 * PRD §41 requires that Persian search tolerates the common Arabic/Persian
 * character confusions, half-spaces and digit systems. Normalization must be
 * identical on both sides, otherwise indexed text and queries drift apart.
 */

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Persian/Arabic-Indic digits to ASCII digits. */
export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p > -1) return String(p);
    return String(ARABIC_INDIC_DIGITS.indexOf(ch));
  });
}

/** Converts ASCII digits to Persian digits — display only, never for storage. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Canonical form used for indexing and querying.
 *
 * - unifies Arabic ي/ك and the various alef/heh forms with their Persian ones
 * - strips diacritics (aerab), tatweel and zero-width marks
 * - turns half-spaces (ZWNJ) into ordinary spaces so "فیلتر هوا" == "فیلترهوا"
 * - lowercases latin text and collapses whitespace
 */
export function normalizePersian(input: string): string {
  if (!input) return '';
  return toEnglishDigits(input)
    .replace(/[يى]/g, 'ی') // ي, ى -> ی
    .replace(/ك/g, 'ک') // ك -> ک
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ -> ا
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/[ؤ]/g, 'و') // ؤ -> و
    .replace(/[ً-ْٰ]/g, '') // harakat
    .replace(/ـ/g, '') // tatweel
    .replace(/[​‍‎‏﻿]/g, '') // zero-width, bidi marks
    .replace(/‌/g, ' ') // ZWNJ -> space
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonical form of a technical / OEM part code: uppercase alphanumerics only.
 * "lf-16352", "LF 16352" and "LF16352" all collapse to "LF16352" so that the
 * exact-code branch of search (PRD §40) fires regardless of how it was typed.
 */
export function normalizeCode(input: string): string {
  return toEnglishDigits(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Heuristic: does this query look like a part number rather than prose?
 * Used to give exact-code matches top ranking.
 */
export function looksLikeCode(input: string): boolean {
  const code = normalizeCode(input);
  if (code.length < 4 || code.length > 24) return false;
  const hasDigit = /\d/.test(code);
  const hasPersian = /[؀-ۿ]/.test(input);
  return hasDigit && !hasPersian;
}

/** Formats a Toman amount for display, e.g. 650000 -> "۶۵۰٬۰۰۰". */
export function formatToman(amount: number, persianDigits = true): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return persianDigits ? toPersianDigits(grouped) : grouped;
}

/** Builds a URL-safe slug that keeps Persian letters readable. */
export function slugify(input: string): string {
  return normalizePersian(input)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
