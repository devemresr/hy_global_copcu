import Fuse from 'fuse.js';
import type { ExcelRow } from './types';
export interface HighlightSegment {
	text: string;
	isMatch: boolean;
}

// Configure Fuse with match info enabled
export function buildFuse(rows: ExcelRow[], keys: string[]) {
	return new Fuse(rows, {
		keys,
		threshold: 0.3,
		includeMatches: true,
		shouldSort: true,
		minMatchCharLength: 2,
	});
}

export const DEBOUNCE_TIMEOUT = 250;

// Returns which columns hold actual Date objects, so we know where to run date comparisons.
export function detectDateColumns(rows: ExcelRow[]): string[] {
	if (rows.length === 0) return [];
	const sample = rows[0];
	return Object.keys(sample).filter((key) =>
		rows.some((row) => row[key] instanceof Date),
	);
}

// Attempts to interpret the query as a date or partial date (year, or year-month).
// Returns a [start, end) range to match against, or null if the query isn't date-like.
export function parseDateQuery(
	query: string,
): { start: Date; end: Date } | null {
	const trimmed = query.trim();

	// Full year, e.g. "2024"
	if (/^\d{4}$/.test(trimmed)) {
		const year = Number(trimmed);
		return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
	}

	// Year-month, e.g. "2024-01" or "2024-1"
	const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
	if (yearMonthMatch) {
		const year = Number(yearMonthMatch[1]);
		const month = Number(yearMonthMatch[2]) - 1;
		return {
			start: new Date(year, month, 1),
			end: new Date(year, month + 1, 1),
		};
	}

	// Full date, e.g. "2024-01-15" or "01/15/2024"  anything JS Date can parse unambiguously
	const parsed = new Date(trimmed);
	if (!isNaN(parsed.getTime()) && /\d/.test(trimmed)) {
		const start = new Date(
			parsed.getFullYear(),
			parsed.getMonth(),
			parsed.getDate(),
		);
		const end = new Date(start);
		end.setDate(end.getDate() + 1);
		return { start, end };
	}

	return null;
}

export function highlightSegments(
	text: string,
	indices: ReadonlyArray<readonly [number, number]>,
): HighlightSegment[] {
	if (!indices.length) return [{ text, isMatch: false }];

	const segments: HighlightSegment[] = [];
	let cursor = 0;

	// Fuse gives [start, end] inclusive ranges, sorted; merge/step through them
	for (const [start, end] of indices) {
		if (start > cursor) {
			segments.push({ text: text.slice(cursor, start), isMatch: false });
		}
		segments.push({ text: text.slice(start, end + 1), isMatch: true });
		cursor = end + 1;
	}
	if (cursor < text.length) {
		segments.push({ text: text.slice(cursor), isMatch: false });
	}

	return segments;
}
