import type { InventoryItemRecord } from '../../types';

export type CustomerPrices = Record<string, number | null>;
export type CustomerPriceRule = { key: string; ruleId: string; ruleName: string; rulePrice: number | null };
export const SPREADSHEET_EXPORT_FORMATS = [
	{ value: 'xlsx', label: 'Excel (.xlsx)' },
	{ value: 'csv', label: 'CSV (.csv)' },
	{ value: 'ods', label: 'OpenDocument (.ods)' },
] as const;
export type SpreadsheetExportFormat = (typeof SPREADSHEET_EXPORT_FORMATS)[number]['value'];
export type InventoryExportFormat = SpreadsheetExportFormat | 'pdf';

export function pricedInventoryItems(items: InventoryItemRecord[]): InventoryItemRecord[] {
	return items.filter((item) => typeof item.fiyat === 'number' && Number.isFinite(item.fiyat) && item.fiyat >= 0);
}

export function customerItemKey(item: InventoryItemRecord): string {
	return JSON.stringify([item.model, item.bellekTipi, item.depolama, item.depolamaBirimi, item.paraBirimi]);
}

export function applyCustomerPrices(items: InventoryItemRecord[], prices: CustomerPrices): InventoryItemRecord[] {
	return items.map((item) => {
		if (!Object.hasOwn(prices, customerItemKey(item))) return item;
		const price = prices[customerItemKey(item)];
		if (price === null) return item;
		// Recheck against live originals when inventory data refreshes.
		if (price !== null && (item.fiyat === null || !Number.isFinite(price) || price < 0 || price > item.fiyat)) return item;
		return { ...item, fiyat: price };
	});
}

export function customerPriceLimit(items: InventoryItemRecord[]): number | null {
	if (!items.length || items.some((item) => item.fiyat === null)) return null;
	return Math.min(...items.map((item) => item.fiyat!));
}

export function validateCustomerPrice(price: number | null, items: InventoryItemRecord[]): void {
	if (price === null) return;
	for (const item of items) {
		if (item.fiyat === null) throw new Error(`${item.model}: Envanterde fiyatı olmayan ürüne fiyat atanamaz.`);
		if (!Number.isFinite(price) || price < 0 || price > item.fiyat) throw new Error(`${item.model}: Fiyat envanter fiyatını (${item.fiyat} ${item.paraBirimi}) aşamaz.`);
	}
}

export function parseCustomerPrice(value: string): number | null {
	if (!value.trim()) return null;
	const price = Number(value.replace(',', '.'));
	if (!Number.isFinite(price) || price < 0) throw new Error('Sıfır veya daha büyük geçerli bir fiyat girin.');
	return price;
}

export function customerPriceGroups(items: InventoryItemRecord[], assignments: readonly CustomerPriceRule[] = []) {
	const rulesByKey = new Map(assignments.map((assignment) => [assignment.key, assignment]));
	const groups = new Map<string, { id: string; type: string; capacity: number | null; label: string; currency: string; items: InventoryItemRecord[]; ruleId?: string; ruleName?: string; rulePrice?: number | null }>();
	for (const item of items) {
		const type = item.bellekTipi?.trim().toUpperCase();
		if (!type) continue;
		const capacity = item.depolama == null ? null : item.depolama * (item.depolamaBirimi === 'TB' ? 1024 : 1);
		const rule = rulesByKey.get(customerItemKey(item));
		const id = JSON.stringify([type, capacity, rule?.ruleId ?? null]);
		if (!groups.has(id)) groups.set(id, { id, type, capacity, label: capacity === null ? 'Depolama belirtilmemiş' : `${capacity} GB`, currency: item.paraBirimi, items: [], ...(rule ? { ruleId: rule.ruleId, ruleName: rule.ruleName, rulePrice: rule.rulePrice } : {}) });
		groups.get(id)!.items.push(item);
	}
	for (const group of groups.values()) group.currency = [...new Set(group.items.map((item) => item.paraBirimi))].sort().join(' / ');
	return [...groups.values()].sort((a, b) => a.type.localeCompare(b.type) || (a.capacity ?? Infinity) - (b.capacity ?? Infinity) || a.currency.localeCompare(b.currency));
}

// Explicit public columns keep database metadata out of customer files.
export function inventoryExportData(items: InventoryItemRecord[], includePrices: boolean) {
	return [
		['Model', 'Bellek Türü', 'Depolama', 'Depolama Birimi', ...(includePrices ? ['Fiyat', 'Para Birimi'] : [])],
		...pricedInventoryItems(items).map((item) => [item.model, item.bellekTipi ?? '', item.depolama ?? null, item.depolamaBirimi,
			...(includePrices ? [item.fiyat, item.paraBirimi] : [])]),
	];
}

export function inventoryExportFilename(format: InventoryExportFormat, includePrices: boolean) {
	return `envanter-${new Date().toISOString().slice(0, 10)}${includePrices ? '-fiyatli' : '-fiyatsiz'}.${format}`;
}

export async function downloadInventory(items: InventoryItemRecord[], includePrices: boolean, format: InventoryExportFormat) {
	const exportItems = pricedInventoryItems(items);
	const filename = inventoryExportFilename(format, includePrices);
	if (format === 'pdf') {
		const { downloadInventoryPdf } = await import('./inventoryPdf.helper');
		await downloadInventoryPdf(exportItems, includePrices, filename);
		return;
	}
	const XLSX = await import('xlsx');
	const sheet = XLSX.utils.aoa_to_sheet(inventoryExportData(exportItems, includePrices).map((row) => row.map((value) =>
		// CSV has no cell types: prevent model names being treated as formulas.
		format === 'csv' && typeof value === 'string' && /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value,
	)));
	sheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, ...(includePrices ? [{ wch: 14 }, { wch: 14 }] : [])];
	sheet['!autofilter'] = { ref: sheet['!ref']! };
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, 'Envanter');
	// SheetJS adds a UTF-8 BOM to CSV downloads for Turkish text in Excel.
	XLSX.writeFile(workbook, filename, { bookType: format, compression: true });
}
