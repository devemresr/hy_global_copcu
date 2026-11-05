export const STOCK_CONTROL =
	'h-9 min-w-0 rounded-lg border border-border bg-button-bg px-2 py-0 text-xs text-text';
export const STOCK_BUTTON = `${STOCK_CONTROL} inline-flex shrink-0 items-center justify-center whitespace-nowrap hover:bg-button-hover-bg disabled:opacity-40`;
// Five visible digits is a width, not a value limit; longer values still scroll.
export const STOCK_NUMBER_CONTROL = `${STOCK_CONTROL} w-fit gap-1! [&_input]:[field-sizing:fixed] [&_input]:w-[5ch] [&_input]:min-w-[5ch] [&_input]:max-w-[5ch] [&_input]:flex-none [&_input]:tabular-nums [&>div]:shrink-0`;
export const STOCK_STEPPER = 'h-7 rounded px-1 py-0';
