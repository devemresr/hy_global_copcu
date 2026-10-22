import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InventoryItemRecord } from '../../types';
import { inventoryExportData, pricedInventoryItems } from './customerInventory.helper';

export function inventoryPdfDocument(items: InventoryItemRecord[], includePrices: boolean): TDocumentDefinitions {
	const exportItems = pricedInventoryItems(items);
	const [headers, ...rows] = inventoryExportData(exportItems, includePrices);
	return {
		pageSize: 'A4',
		pageMargins: [30, 36, 30, 36],
		info: { title: 'Envanter', author: 'HY Global' },
		defaultStyle: { font: 'Roboto', fontSize: 9 },
		content: [
			{ text: 'Envanter', fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
			{ text: `${exportItems.length} ürün · ${new Date().toLocaleDateString('tr-TR')} · ${includePrices ? 'Fiyatlar dahil' : 'Fiyatlar hariç'}`, color: '#555555', margin: [0, 0, 0, 14] },
			{
				table: {
					headerRows: 1,
					widths: ['*', 'auto', 'auto', 'auto', ...(includePrices ? ['auto', 'auto'] : [])],
					body: [
						headers.map((header) => ({ text: String(header), bold: true, fillColor: '#eeeeee' })),
						...rows.map((row) => row.map((value) => ({ text: value == null ? '' : String(value) }))),
					],
				},
				layout: 'lightHorizontalLines',
			},
		],
		footer: (page, pages) => ({ text: `${page} / ${pages}`, alignment: 'center', fontSize: 8, color: '#666666' }),
	};
}

export async function downloadInventoryPdf(items: InventoryItemRecord[], includePrices: boolean, filename: string) {
	const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
		import('pdfmake/build/pdfmake'),
		import('pdfmake/build/vfs_fonts'),
	]);
	// Bundle the font with the app so Turkish text works without a font server.
	pdfMake.addVirtualFileSystem(fonts);
	await pdfMake.createPdf(inventoryPdfDocument(items, includePrices)).download(filename);
}
