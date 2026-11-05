import type {
	Content,
	CustomTableLayout,
	TDocumentDefinitions,
} from 'pdfmake/interfaces';

export const ORDER_PDF_PAGE = {
	pageSize: 'A4' as const,
	pageMargins: [32, 40, 32, 44] as [number, number, number, number],
	defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.15 },
	pageBreakBefore: ((node, container) =>
		node.headlineLevel === 1 &&
		container.getFollowingNodesOnPage().length === 0) as NonNullable<
		TDocumentDefinitions['pageBreakBefore']
	>,
};
// A4 is 595.28pt wide. Leave a small rounding allowance inside the margins.
export const ORDER_PDF_CONTENT_WIDTH = 595.28 - 32 - 32 - 2;
const CELL_PADDING = 4;
const layout: CustomTableLayout = {
	hLineWidth: () => 0.5,
	vLineWidth: () => 0,
	hLineColor: () => '#dddddd',
	paddingLeft: () => CELL_PADDING,
	paddingRight: () => CELL_PADDING,
	paddingTop: () => 5,
	paddingBottom: () => 5,
};

// Break long identifiers and numeric groups without dropping any characters.
export function pdfWrapText(value: string | number): string {
	return String(value)
		.replace(/[\u00a0\u202f]/g, ' ')
		.replace(/[^\s\u200b]{13,}/gu, (word) => {
			const characters = Array.from(word);
			return characters
				.map(
					(character, index) =>
						`${index > 0 && index % 12 === 0 ? '\u200b' : ''}${character}`,
				)
				.join('');
		});
}

export function orderPdfTable(
	headers: string[],
	rows: (string | number)[][],
	weights = headers.map(() => 1),
	headerColor = '#eeeeee',
): Content {
	const usable = ORDER_PDF_CONTENT_WIDTH - headers.length * CELL_PADDING * 2;
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	return {
		fontSize: headers.length >= 6 ? 8 : 9,
		table: {
			headerRows: 1,
			// Rows may span pages, including a row taller than an entire page.
			dontBreakRows: false,
			keepWithHeaderRows: 0,
			widths: weights.map((weight) => (usable * weight) / totalWeight),
			body: [
				headers.map((text) => ({
					text: pdfWrapText(text),
					bold: true,
					fillColor: headerColor,
				})),
				...rows.map((row) =>
					row.map((value) => ({ text: pdfWrapText(value), noWrap: false })),
				),
			],
		},
		layout,
	};
}
