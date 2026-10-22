// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import { downloadInventory, type InventoryExportFormat } from '../app/helpers/inventoryPageHelpers/customerInventory.helper';
import { inventoryPdfDocument } from '../app/helpers/inventoryPageHelpers/inventoryPdf.helper';
import type { InventoryItemRecord } from '../app/types';

const captures = vi.hoisted(() => ({ files: [] as { name: string; data: ArrayBuffer }[] }));
vi.mock('xlsx', async (importOriginal) => {
	const original = await importOriginal<typeof import('xlsx')>();
	return { ...original, writeFile: (workbook: XLSX.WorkBook, name: string, options: XLSX.WritingOptions) => {
		captures.files.push({ name, data: original.write(workbook, { ...options, type: 'array' }) });
	} };
});
afterEach(() => { captures.files = []; });

const items: InventoryItemRecord[] = [
	{ model: '00123', bellekTipi: 'eMMC', depolama: 64, depolamaBirimi: 'GB', fiyat: 0, paraBirimi: 'TRY', uretici: 'Excluded manufacturer', ram: 'Excluded RAM' },
	{ model: 'Türkçe, "İşlemci"', bellekTipi: 'eMCP', depolama: 1, depolamaBirimi: 'TB', fiyat: 123.5, paraBirimi: 'USD' },
];

describe('customer export formats', () => {
	it.each(['xlsx', 'ods', 'csv'] as const)('excludes unpriced products from %s even without price columns', async (format) => {
		await downloadInventory([...items, { ...items[0], model: 'UNPRICED', fiyat: null }], false, format);
		const workbook = XLSX.read(captures.files[0].data, { type: 'array', raw: true });
		const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
		expect(rows).toHaveLength(3);
		expect(JSON.stringify(rows)).not.toContain('UNPRICED');
	});
	it('excludes unpriced products from PDF and its product count', () => {
		const document = inventoryPdfDocument([...items, { ...items[0], model: 'UNPRICED', fiyat: null }], false);
		expect(JSON.stringify(document.content)).not.toContain('UNPRICED');
		expect(JSON.stringify(document.content)).toContain('2 ürün');
	});
	it.each(['xlsx', 'ods'] as const)('downloads valid %s files with numeric prices and text model codes', async (format) => {
		await downloadInventory(items, true, format);
		expect(captures.files[0].name).toMatch(new RegExp(`-fiyatli\\.${format}$`));
		const workbook = XLSX.read(captures.files[0].data, { type: 'array' });
		expect(XLSX.utils.sheet_to_json(workbook.Sheets.Envanter, { header: 1 })).toEqual([
			['Model', 'Bellek Türü', 'Depolama', 'Depolama Birimi', 'Fiyat', 'Para Birimi'],
			['00123', 'eMMC', 64, 'GB', 0, 'TRY'],
			['Türkçe, "İşlemci"', 'eMCP', 1, 'TB', 123.5, 'USD'],
		]);
	});
	it('downloads UTF-8 CSV with correctly escaped commas, quotes and formula-like text', async () => {
		await downloadInventory([...items, { ...items[0], model: '=1+1' }], true, 'csv');
		const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(captures.files[0].data);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
		expect(csv).toContain('"Türkçe, ""İşlemci"""');
		expect(csv).toContain("'=1+1");
		expect(csv).not.toContain('Excluded');
	});
	it.each(['xlsx', 'ods', 'csv'] as const)('omits both price and currency in %s when prices are disabled', async (format: InventoryExportFormat) => {
		await downloadInventory(items, false, format);
		const workbook = XLSX.read(captures.files[0].data, { type: 'array', raw: true });
		const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
		expect(rows[0]).toEqual(['Model', 'Bellek Türü', 'Depolama', 'Depolama Birimi']);
		expect(rows.every((row) => row.length === 4)).toBe(true);
		expect(captures.files[0].name).toContain('-fiyatsiz.');
	});
	it('generates a multipage PDF with embedded fonts and repeating table headings', async () => {
		pdfMake.addVirtualFileSystem(fonts);
		const document = inventoryPdfDocument(Array.from({ length: 120 }, (_, index) => ({ ...items[index % 2], model: `Model ${index} Türkçe` })), true);
		const buffer = await pdfMake.createPdf(document).getBuffer();
		expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
		expect(buffer.toString('latin1')).toContain('/FontFile2');
		expect((buffer.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
		expect(document.content).toEqual(expect.arrayContaining([expect.objectContaining({ table: expect.objectContaining({ headerRows: 1 }) })]));
	}, 20000);
	it('omits prices, currency, manufacturer and RAM from PDF without prices', () => {
		const content = JSON.stringify(inventoryPdfDocument(items, false).content);
		for (const omitted of ['"Fiyat"', 'Para Birimi', 'USD', 'TRY', 'Excluded', 'Üretici', 'RAM']) expect(content).not.toContain(omitted);
		expect(content).toContain('Türkçe');
	});
});
