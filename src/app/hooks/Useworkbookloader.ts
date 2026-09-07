import {
	useEffect,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
} from 'react';
import * as XLSX from 'xlsx';
import logger from '../util/logger';
import type {
	ExcelRow,
	ParseStatus,
	ParseMethod,
	OnErrorCallback,
} from '../types';
import {
	parseInline,
	parseWithWorker,
	unmergeSheet,
	WORKER_SIZE_THRESHOLD_BYTES,
} from '../helpers/inventoryPageHelpers/parseFile.helper';
import {
	columnDefsBySheet,
	FIELD_NAMES,
} from '../constants/columnDefinitons.constant';
import {
	initialWorkbookState,
	workbookReducer,
} from '../helpers/inventoryPageHelpers/wbState.helper';

type ParseState = {
	status: ParseStatus;
	errorMsg: string;
	parseMethod: ParseMethod;
};

function parseSelectedSheet(wb: XLSX.WorkBook, sheetName: string): ExcelRow[] {
	const sheet = wb.Sheets[sheetName];
	unmergeSheet(sheet);

	return XLSX.utils.sheet_to_json<ExcelRow>(sheet);
}

export function useWorkbookLoader({
	bellekTipiIncluded,
}: {
	bellekTipiIncluded?: boolean;
}) {
	const [parseState, setParseState] = useState<ParseState>({
		status: 'idle',
		errorMsg: '',
		parseMethod: null,
	});
	const [wbState, dispatch] = useReducer(workbookReducer, initialWorkbookState);
	const workerRef = useRef<Worker | null>(null);

	const {
		workbook,
		sheetNames,
		selectedSheet,
		rows,
		colDef,
		columnFiltersBySheet,
	} = wbState;

	// terminate possibly pending workers on unmount
	useEffect(() => {
		return () => {
			if (workerRef.current) {
				workerRef.current.terminate();
			}
		};
	}, []);

	const handleError: OnErrorCallback = (message) => {
		setParseState((prev) => ({
			...prev,
			status: 'error',
			errorMsg: message,
		}));
	};

	function normalizeAndFilterRows(rows: ExcelRow[]): ExcelRow[] {
		return rows
			.map((row) => {
				const gb = parseMemorySize(row?.Depoloma as string);
				return { ...row, __gb: gb }; // temp field to filter on
			})
			.filter((row) => row.__gb !== null && (row?.__gb as number) >= 8)
			.map(({ __gb, ...row }) => ({
				...row,
				Depoloma: formatMemorySize(__gb as number),
			}));
	}

	useLayoutEffect(() => {
		if (!workbook || !selectedSheet) return;

		const parsedRows = parseSelectedSheet(workbook, selectedSheet);
		const cleanedRows = normalizeAndFilterRows(parsedRows);

		const BellekTipiFilteredRows = cleanedRows.map((row) => {
			if (bellekTipiIncluded) {
				return row; // keep ic_type as-is
			}
			const { ic_type, ...rest } = row; // destructure it out
			return rest;
		});

		const empcFilteredColDefs = columnDefsBySheet[selectedSheet].filter(
			(colDef) =>
				!(!bellekTipiIncluded && colDef?.field === FIELD_NAMES.BellekTipi),
		);

		dispatch({
			type: 'ROWS_PARSED',
			rows: BellekTipiFilteredRows,
			colDef: empcFilteredColDefs,
		});
	}, [workbook, selectedSheet, bellekTipiIncluded, dispatch]);

	function handleFileChange(file: File) {
		setParseState((prev) => ({
			...prev,
			status: 'parsing',
			errorMsg: '',
		}));

		const onLoaded = (wb: XLSX.WorkBook) => {
			dispatch({
				type: 'WORKBOOK_LOADED',
				workbook: wb,
				sheetNames: wb.SheetNames,
			});
			dispatch({
				type: 'SHEET_SELECTED',
				sheetName: wb.SheetNames[0],
			}); // placeholder; real parse happens once the effect above sees workbook+selectedSheet both set
			setParseState((prev) => ({
				...prev,
				status: 'idle',
			}));
		};

		if (file.size > WORKER_SIZE_THRESHOLD_BYTES) {
			logger.debug(
				`File is ${(file.size / 1024 / 1024).toFixed(2)}MB using worker`,
			);
			setParseState((prev) => ({
				...prev,
				parseMethod: 'worker',
			}));
			parseWithWorker(file, workerRef, onLoaded, handleError);
		} else {
			logger.debug(`File is ${(file.size / 1024).toFixed(0)}KB parsing inline`);
			setParseState((prev) => ({
				...prev,
				parseMethod: 'inline',
			}));
			parseInline(file, onLoaded, handleError);
		}
	}

	function toGb(num: number, unit: string) {
		if (unit === 'G') return num;
		if (unit === 'T') return num * 1024;
	}

	function parseMemorySize(raw: string) {
		if (raw === undefined || raw === null) return null;
		const s = String(raw).trim();
		if (!s || s === '?') return null;

		// Simple "<number><unit>" format, any casing/spacing: "8 Gb", "16gb", "1T", "256M"
		const simple = s.match(/^(\d+(?:\.\d+)?)\s*([MGT])B?$/i);
		if (simple) {
			return toGb(parseFloat(simple[1]), simple[2].toUpperCase());
		}

		return null; // unparseable returned for manual
	}

	function formatMemorySize(gbValue: number) {
		if (gbValue >= 1024 && gbValue % 1024 === 0) return `${gbValue / 1024} Tb`;
		return `${gbValue} Gb`;
	}

	return {
		workbook,
		sheetNames,
		selectedSheet,
		rows,
		colDef,
		columnFiltersBySheet,
		dispatch,
		parseState,
		handleFileChange,
	};
}
