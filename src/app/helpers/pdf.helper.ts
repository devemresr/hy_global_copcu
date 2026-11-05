import type { TDocumentDefinitions } from 'pdfmake/interfaces';

async function preparePdf(document: TDocumentDefinitions) {
	const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
		import('pdfmake/build/pdfmake'),
		import('pdfmake/build/vfs_fonts'),
	]);
	// Keep bundled Roboto fonts for Turkish text and offline exports.
	pdfMake.addVirtualFileSystem(fonts);
	return pdfMake.createPdf(document);
}

export async function downloadPdf(
	document: TDocumentDefinitions,
	filename: string,
) {
	await (await preparePdf(document)).download(filename);
}

export async function createPdfFile(
	document: TDocumentDefinitions,
	filename: string,
) {
	const blob = await (await preparePdf(document)).getBlob();
	return new File([blob], filename, { type: 'application/pdf' });
}

export function downloadPdfFile(file: File) {
	const url = URL.createObjectURL(file);
	const link = document.createElement('a');
	link.href = url;
	link.download = file.name;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
