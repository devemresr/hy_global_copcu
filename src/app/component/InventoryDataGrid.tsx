import { forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import {
	ModuleRegistry,
	TextFilterModule,
	NumberFilterModule,
	ClientSideRowModelModule,
	themeQuartz,
	colorSchemeDark,
} from 'ag-grid-community';
import { useTheme } from './Layout';
import { useWindowSize } from '../hooks/useWindowSize';

ModuleRegistry.registerModules([
	ClientSideRowModelModule, // needed for basic rowData rendering
	TextFilterModule, // for Brand/Model text filters
	NumberFilterModule, // for numbering filtering
]);

type InventoryDataGridProps = {
	rowData: Record<string, unknown>[];
	columnDefs: ColDef[];
};

// Shared AG Grid setup for anywhere the inventory catalog is browsed - the
// public inventory page and the admin item list both render this over their
// own rows/columnDefs, so the theme wiring and the mobile/desktop column
// sizing split only exist in one place.
export const InventoryDataGrid = forwardRef<AgGridReact, InventoryDataGridProps>(
	function InventoryDataGrid({ rowData, columnDefs }, ref) {
		const { theme } = useTheme();
		const gridTheme =
			theme === 'dark' ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
		const { width } = useWindowSize();

		return (
			<div className='w-full min-w-0 h-[70vh]'>
				<AgGridReact
					theme={gridTheme}
					rowData={rowData}
					columnDefs={columnDefs}
					// Below tablet width, columns stay at their own explicit width
					// (see columnDefsBySheet) so mobile gets a compact, predictable
					// layout - overflowing content scrolls within its own cell (see
					// the .ag-cell rule in App.css) instead of every column being
					// force-stretched to fill the container regardless of content.
					// From tablet width up there's room to spare, so flex:1 lets
					// columns stretch to fill it instead of leaving it empty.
					defaultColDef={{
						sortable: true,
						resizable: true,
						flex: width >= 768 ? 1 : undefined,
					}}
					alwaysMultiSort={width < 768}
					ref={ref}
				/>
			</div>
		);
	},
);
