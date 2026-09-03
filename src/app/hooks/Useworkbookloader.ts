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
} from '../parseFile.helper';
import { columnDefsBySheet } from '../columnDef.constant';
import { initialWorkbookState, workbookReducer } from '../wbState.helper';

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
	emcpIncluded,
}: {
	emcpIncluded?: boolean;
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

	useLayoutEffect(() => {
		if (!workbook || !selectedSheet) return;
		const parsedRows = parseSelectedSheet(workbook, selectedSheet);

		const empcFilteredRows = parsedRows.map((row) => {
			if (emcpIncluded) {
				return row; // keep EMCP as-is
			}
			const { EMCP, ...rest } = row; // destructure it out
			return rest;
		});

		const empcFilteredColDefs = columnDefsBySheet[selectedSheet].filter(
			(colDef) => !(!emcpIncluded && colDef?.field === 'EMCP'),
		);

		dispatch({
			type: 'ROWS_PARSED',
			rows: empcFilteredRows,
			colDef: empcFilteredColDefs,
		});
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
		colDef,
		columnFiltersBySheet,
		dispatch,
		parseState,
		handleFileChange,
	};
}
