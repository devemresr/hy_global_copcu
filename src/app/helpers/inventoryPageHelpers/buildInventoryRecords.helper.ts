import { inventoryData } from '../../assets/inventoryDATA';
import { BELLEK_TIPI_EXCLUDED_VALUES } from '../../constants/bellekTipi.constant';
import { buildDisplaySafeFinalData } from './tempDataValidation.debug';

// Plain-TS on purpose (no React/ag-grid imports anywhere in its import
// chain): the DB seed script (server/scripts/seed.ts) imports this directly
// to turn the bundled Excel-derived dataset into rows it can upsert into
// Mongo. Items already in the DB (served over /items) are past this cleanup
// - useInventoryRows reads those straight from the API response instead of
// routing them back through here.
//
// fiyat is left as the raw "150 TL"-style string here (not split into a
// number + paraBirimi, unlike InventoryItemRecord/ItemDto) because
// inventoryData has no separate currency field to split it from yet -
// that split lands once the backend is actually hosted.
export function buildInventoryRecords() {
	const cleanedRows = buildDisplaySafeFinalData(inventoryData, {
		// overrides: [{ prefix: 'PA', overrides: { Fiyat: '150 TL' } }],
		filters: [
			{
				field: 'BellekTipi',
				op: 'notIn',
				value: BELLEK_TIPI_EXCLUDED_VALUES,
			},
			{ field: 'Depoloma', op: 'gte', value: '8 GB', sizeAware: true },
		],
	});

	return cleanedRows.map((row) => {
		const fiyat = row.Fiyat;
		return {
			uretici: (row.manufacturer as string) ?? null,
			ram: (row.ram as string) ?? null,
			eslesmeTuru: (row.match_type as string) ?? null,
			bellekTipi: (row.BellekTipi as string) ?? null,
			sorgulananDeger: (row.queried_as as string) ?? null,
			model: String(row.Model ?? ''),
			depolama: (row.Depoloma as string) ?? null,
			fiyat: fiyat ?? null,
		};
	});
}
