import type { Rates, RatesByTerm } from '../PaymentCalculator';

export const defaultRates: Rates = {
	interestRateBelow30k: 3.25,
	interestRate30to180k: 3.75,
	interestRateAbove180k: 4.25,
};
export const TERM_DEPENDENT_RATES: Partial<Record<string, RatesByTerm>> = {
	'Yapı Kredi': {
		2: {
			interestRateBelow30k: 2.113,
			interestRate30to180k: 2.438,
			interestRateAbove180k: 2.763,
		},
		3: {
			interestRateBelow30k: 4.225,
			interestRate30to180k: 4.875,
			interestRateAbove180k: 5.525,
		},
	},
};
