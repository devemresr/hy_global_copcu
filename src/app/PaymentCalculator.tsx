import { useState } from 'react';
import { collabButtons } from './component/paymentCalculator/collabButtons.tsx';
import BankSelect from './component/paymentCalculator/BankSelect.tsx';
import InstallmentTable from './component/paymentCalculator/InstallmentTable.tsx';
import { NumberInputWithSteppers } from './component/NumberInputWithSteppers.tsx';
import '../app/App.css';
import { InterestRateInput } from './component/RateInput.tsx';
export interface Bank {
	name: string;
	lateInstallmentRates: Rates | RatesByTerm;
	shoppingRates: Rates | RatesByTerm;
	lateInstallmentTerms: number[];
	shoppingTerms: number[];
	taxIncluded: boolean;
}
export type RatesByTerm = Record<number, Rates>;

export interface Rates {
	interestRateBelow30k: number;
	interestRate30to180k: number;
	interestRateAbove180k: number;
}

export const defaultRates: Rates = {
	interestRateBelow30k: 3.25,
	interestRate30to180k: 3.75,
	interestRateAbove180k: 4.25,
};
export type LoanType = (typeof collabButtons)[number]['key'];
const BANK_NAMES = [
	'Garanti',
	'Kuveyt Türk',
	'İş Bankası',
	'Yapı Kredi',
	'Akbank',
	'Vakıf Bank',
	'QNB',
	'HSBC',
	'Ziraat',
];

const OVERRIDES: Partial<Record<string, Partial<Rates>>> = {};
const DEFAULT_TERMS = [2, 3, 4, 5, 6, 9, 10, 11, 12];
const TERM_OVERRIDES: Partial<
	Record<string, { lateInstallmentTerms?: number[]; shoppingTerms?: number[] }>
> = {
	Garanti: { lateInstallmentTerms: [2, 3, 4, 5, 6, 9, 11] },
	'İş Bankası': { lateInstallmentTerms: [...DEFAULT_TERMS, 18] },
	Akbank: { lateInstallmentTerms: [...DEFAULT_TERMS, 18] },
	HalkBank: { lateInstallmentTerms: [3, 6, 9, 12] },
	HSBC: { lateInstallmentTerms: [2, 3, 4, 5, 6, 9, 12] },
	QNB: { lateInstallmentTerms: [3, 6, 9, 12] },
	'Yapı Kredi': { lateInstallmentTerms: [2, 3] },
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
const TAX_OVERWRITE: Partial<Record<string, boolean>> = {
	'Yapı Kredi': true,
};

export function PaymentCalculator() {
	const shoppingCreditCalcKey = collabButtons[0].key;
	const [loanType, setLoanType] = useState<LoanType>(shoppingCreditCalcKey);
	const [loanAmount, setLoanAmount] = useState<number | ''>(10000);
	const [interestRate, setInterestRate] = useState<number | ''>(3.5);
	const isPostPurchaseInstallmentCalc =
		loanType === 'postPurchaseInstallmentCalc';

	const BANKS: Bank[] = BANK_NAMES.map((name) => ({
		name,
		lateInstallmentRates: isPostPurchaseInstallmentCalc
			? (TERM_DEPENDENT_RATES[name] ?? {
					...defaultRates,
					...OVERRIDES[name],
				})
			: {
					...defaultRates,
					...OVERRIDES[name],
				},
		shoppingRates: {
			...defaultRates,
			...OVERRIDES[name],
		},
		lateInstallmentTerms:
			TERM_OVERRIDES[name]?.lateInstallmentTerms ?? DEFAULT_TERMS,
		shoppingTerms: TERM_OVERRIDES[name]?.shoppingTerms ?? DEFAULT_TERMS,
		taxIncluded: TAX_OVERWRITE[name] ?? false,
	}));
	const [selected, setSelected] = useState(BANKS[0].name);

	return (
		<div className='w-screen z-0 bg-bg '>
			<div className='max-w-200 mx-auto px-4 py-20text-text transition-colors duration-300 '>
				<div className='p-2 flex items-center justify-between select-none'>
					<span className='text-text'>Taksit Hesaplama</span>
				</div>
				<div
					className={`justify-between items-center transition-all gap-2 duration-800 ease-in-out mb-4 animate-modal-bounce flex flex-col sm:flex-row`}
				>
					{collabButtons.map((btn) => {
						const isSelected = loanType === btn.key;
						return (
							<button
								key={btn.key}
								className='relative group w-65 p-2   overflow-hidden rounded-xl shadow-xl bg-button-bg'
								onClick={() => {
									setLoanType(btn.key as LoanType);
								}}
							>
								<p className='relative z-10 select-none text-text'>
									{btn.label}
								</p>
								<div
									className={`absolute top-0 left-0 z-0 w-full h-full bg-button-bg
        									transition-colors duration-1500 ease-in-out
        									blur-lg
        									${btn.bgHover}
        									${isSelected ? `${btn.bg}` : ''}
      									`}
								>
									<div className='absolute inset-0 z-0 flex'>
										{btn.shapes.map((shape, i) => (
											<div
												key={i}
												className={`
										h-full 
										${shape.flex ?? 'flex-1'}
										transition-colors duration-1000 ease-in-out
										${shape.colorHover}
										${isSelected ? shape.bg : 'bg-gray-400 dark:bg-gray-600'}`}
											/>
										))}
									</div>
								</div>
							</button>
						);
					})}
				</div>
				{loanType === 'merchantPayout' && (
					<div className='flex items-center gap-3 my-4'>
						<label htmlFor='numInput' className='w-max select-none text-text'>
							Faiz Oranı:
						</label>
						<InterestRateInput
							value={interestRate}
							onChange={setInterestRate}
						></InterestRateInput>
					</div>
				)}
				{loanType !== 'merchantPayout' && (
					<BankSelect
						selectedBank={selected}
						onChange={setSelected}
						banks={BANKS}
					></BankSelect>
				)}
				<div className='flex items-center gap-3 mb-4 mt-4'>
					<label htmlFor='numInput' className='w-max select-none text-text'>
						Ürün Fiyatı:
					</label>
					<NumberInputWithSteppers
						value={loanAmount}
						onChange={setLoanAmount}
					></NumberInputWithSteppers>
				</div>

				<InstallmentTable
					bank={BANKS.find((bank) => bank.name === selected) as Bank}
					loanAmount={loanAmount}
					loanType={loanType}
					interestRate={interestRate}
				></InstallmentTable>
			</div>
		</div>
	);
}
