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
	ParseStatus,
	ParseMethod,
	OnErrorCallback,
} from '../types';
import {
	parseInline,
	parseWithWorker,
	WORKER_SIZE_THRESHOLD_BYTES,
} from '../helpers/inventoryPageHelpers/parseFile.helper';
import { parseSheetRows } from '../helpers/inventoryPageHelpers/sheet.helper';
import {
	initialWorkbookState,
	workbookReducer,
} from '../helpers/inventoryPageHelpers/wbState.helper';
import { normalizeAndFilterRows } from '../helpers/inventoryPageHelpers/rowNormalize.helper';

type ParseState = {
	status: ParseStatus;
	errorMsg: string;
	parseMethod: ParseMethod;
};

/**
 * Generic Excel-workbook loading hook: reads an uploaded File into an
 * XLSX.WorkBook (inline on the main thread, or off-thread via a Web Worker
 * once it's past WORKER_SIZE_THRESHOLD_BYTES), then parses and normalizes
 * the selected sheet into rows.
 */
export function useWorkbookLoader() {
	const [parseState, setParseState] = useState<ParseState>({
		status: 'idle',
		errorMsg: '',
		parseMethod: null,
	});
	const [wbState, dispatch] = useReducer(workbookReducer, initialWorkbookState);
	const workerRef = useRef<Worker | null>(null);

	const { workbook, sheetNames, selectedSheet, rows } = wbState;

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

	useLayoutEffect(() => {
		if (!workbook || !selectedSheet) return;

		const parsedRows = parseSheetRows(workbook, selectedSheet);
		const normalizedRows = normalizeAndFilterRows(parsedRows);

		dispatch({ type: 'ROWS_PARSED', rows: normalizedRows });
	}, [workbook, selectedSheet]);

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

	return {
		workbook,
		sheetNames,
		selectedSheet,
		rows,
		dispatch,
		parseState,
		handleFileChange,
	};
}
