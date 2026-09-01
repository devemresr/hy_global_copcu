import {
	defaultRates,
	TERM_DEPENDENT_RATES,
	type Bank,
	type LoanType,
	type Rates,
	type RatesByTerm,
} from '../../PaymentCalculator';
import InfoTooltip from './InfoToolTip';

type Row = {
	monthlyPayment: string;
	total: string;
	totalInterest: string;
	totalBsmv?: number;
	totalKkdf?: number;
	term: number;
	rate: number;
};

type MerchantRow = {
	term: number;
	rate: number;
	discountAmount: string;
	netPayout: string;
};

type Props = {
	bank: Bank;
	loanAmount: number | '';
	loanType: LoanType;
	interestRate?: number | '';
};

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
	style: 'currency',
	currency: 'TRY',
});
const KKDF_RATE = 15;
const BSMV_RATE = 15;

export default function InstallmentTable({
	bank,
	loanAmount,
	loanType,
	interestRate,
}: Props) {
	function isRatesByTerm(r: Rates | RatesByTerm): r is RatesByTerm {
		return !('interestRateBelow30k' in r);
	}

	function getRatesForTerm(
		rates: Rates | RatesByTerm,
		term: number,
		fallback: Rates,
	): Rates {
		if (!isRatesByTerm(rates)) return rates;
		return rates[term] ?? fallback;
	}

	const calculateLoan = (
		principal: number,
		term: number,
		interestRate: number,
		kkdfRate = KKDF_RATE,
		bsmvRate = BSMV_RATE,
	) => {
		const netInterestRate = interestRate / 100;
		const grossInterestRate =
			netInterestRate * (1 + kkdfRate / 100 + bsmvRate / 100);

		const powerExpression = Math.pow(1 + grossInterestRate, term);
		const monthlyPayment =
			(principal * (grossInterestRate * powerExpression)) /
			(powerExpression - 1);

		let remainingPrincipal = principal;
		let totalKkdf = 0;
		let totalBsmv = 0;
		let totalInterest = 0;

		for (let month = 1; month <= term; month++) {
			const interestPortion = remainingPrincipal * netInterestRate;
			const kkdfPortion = interestPortion * (kkdfRate / 100);
			const bsmvPortion = interestPortion * (bsmvRate / 100);
			const totalInterestAndTaxes = interestPortion + kkdfPortion + bsmvPortion;

			let principalPortion = monthlyPayment - totalInterestAndTaxes;
			if (month === term) {
				principalPortion = remainingPrincipal;
			}

			remainingPrincipal -= principalPortion;
			totalKkdf += kkdfPortion;
			totalBsmv += bsmvPortion;
			totalInterest += interestPortion;
		}

		const totalRepayment = monthlyPayment * term;

		return {
			monthlyPayment,
			totalRepayment,
			totalInterest,
			totalKkdf,
			totalBsmv,
		};
	};

	/**
	 * İskonto Tutarı = Tutar × (Oran / 100) × Ay Sayısı
	 * Satıcıya Kalan = Tutar − İskonto Tutarı
	 */
	const calculateMerchantPayout = (
		principal: number,
		term: number,
		rate: number,
	) => {
		const discountAmount = principal * (rate / 100) * term;
		const netPayout = principal - discountAmount;
		return { discountAmount, netPayout };
	};

	const isShoppingCalc = loanType === 'shoppingCreditCalc';
	const isMerchantPayout = loanType === 'merchantPayout';

	//  merchantPayout: flat rate, own term list, own row shape
	if (isMerchantPayout) {
		const rate = typeof interestRate === 'number' ? interestRate : 0;
		const terms = bank.shoppingTerms; // reuse the bank's term list

		const merchantRows: MerchantRow[] =
			loanAmount === '' || loanAmount <= 0 || !rate
				? []
				: terms.map((term) => {
						const { discountAmount, netPayout } = calculateMerchantPayout(
							loanAmount,
							term,
							rate,
						);
						return {
							term,
							rate,
							discountAmount: currencyFormatter.format(discountAmount),
							netPayout: currencyFormatter.format(netPayout),
						};
					});

		if (merchantRows.length === 0) {
			return null;
		}

		return (
			<div className='w-full max-w-2xl mx-auto rounded-2xl  border-border shadow-sm overflow-hidden '>
				<div className='w-full overflow-x-auto'>
					<table className='w-full border-collapse text-center'>
						<thead>
							<tr className='bg-blue-500 text-white select-none text-center border-b-4 border-b-border *:border-r-2 *:border-r-border'>
								<th className='py-3 px-4 font-semibold'>Ay Sayısı</th>
								<th className='py-3 px-4 font-semibold hidden sm:table-cell'>
									<div className='flex items-center justify-center gap-1'>
										İskonto Oranı
									</div>
								</th>
								<th className='py-3 px-4 font-semibold'>İskonto Tutarı</th>
								<th className='py-3 px-4 font-semibold last:border-r-0'>
									<div className='flex items-center justify-center gap-1'>
										Satıcıya Kalan Tutar
										<InfoTooltip
											content={[
												'İskonto Tutarı = Tutar × Oran × Ay Sayısı',
												'Satıcıya Kalan = Tutar − İskonto Tutarı',
											]}
										/>
									</div>
								</th>
							</tr>
						</thead>
						<tbody className='dark:[&>tr:nth-child(even)]:bg-gray-900 [&>tr:nth-child(even)]:bg-gray-200'>
							{merchantRows.map((row) => (
								<tr
									key={row.term}
									className='border-b-2 *:border-r-2 *:border-r-border border-b-border text-text  last:border-b-0'
								>
									<td className='py-3 px-4 text-text'>{row.term}</td>
									<td className='py-3 px-4 text-text hidden sm:table-cell'>
										% {row.rate}
									</td>
									<td className='py-3 px-4 text-text'>{row.discountAmount}</td>
									<td className='py-3 px-4 text-text last:border-r-0'>
										{row.netPayout}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className='sm:hidden text-center text-[10px] text-text/50 py-1 select-none'>
					← Tabloyu kaydırmak için sağa/sola sürükleyin →
				</div>
			</div>
		);
	}

	//  existing shoppingCreditCalc / lateInstallmentTerms behavior
	const terms = isShoppingCalc ? bank.shoppingTerms : bank.lateInstallmentTerms;
	const rawRates = isShoppingCalc
		? bank.shoppingRates
		: bank.lateInstallmentRates;

	const getInterestRate = (amount: number, rates: Rates): number => {
		if (amount < 30_000) return rates.interestRateBelow30k;
		if (amount <= 180_000) return rates.interestRate30to180k;
		return rates.interestRateAbove180k;
	};

	const isBankTermDependentRates =
		Object.keys(TERM_DEPENDENT_RATES).find((key) => key === bank.name) &&
		!isShoppingCalc;

	const rows: Row[] =
		loanAmount === '' || loanAmount <= 0
			? []
			: terms.map((term) => {
					const rates = getRatesForTerm(rawRates, term, defaultRates);
					const rate = getInterestRate(loanAmount, rates);
					if (bank.taxIncluded) {
						const interest = (rate / 100) * loanAmount;
						return {
							term,
							total: currencyFormatter.format(interest + loanAmount),
							monthlyPayment: currencyFormatter.format(interest / term),
							totalInterest: currencyFormatter.format(interest),
							rate,
						};
					}
					const {
						monthlyPayment,
						totalRepayment,
						totalInterest,
						totalBsmv,
						totalKkdf,
					} = calculateLoan(loanAmount, term, rate);
					return {
						term: term,
						monthlyPayment: currencyFormatter.format(monthlyPayment),
						total: currencyFormatter.format(totalRepayment),
						totalInterest: currencyFormatter.format(totalInterest),
						totalBsmv,
						totalKkdf,
						rate,
					};
				});

	if (rows.length === 0) {
		return null;
	}
	const headerRates =
		terms.length > 0
			? getRatesForTerm(rawRates, terms[0], defaultRates)
			: defaultRates;

	return (
		<div className='w-full max-w-2xl mx-auto rounded-2xl  border-border shadow-sm overflow-hidden '>
			<div className='w-full overflow-x-auto'>
				<table className='w-full border-collapse text-center'>
					<thead>
						<tr className='bg-blue-500 text-white select-none text-center border-b-4 border-b-border *:border-r-2 *:border-r-border'>
							<th className='py-3 px-4 font-semibold'>Taksit</th>
							<th className='py-3 px-4 font-semibold'>Taksit Tutarı</th>
							<th className='py-3 px-4 font-semibold'>Toplam Ödenecek Tutar</th>
							{!bank?.taxIncluded && (
								<th className='py-3 px-4 font-semibold hidden sm:table-cell'>
									<div className='flex items-center justify-center gap-1 w-max'>
										Vergiler
										<InfoTooltip
											content={[
												`Güncel KKDF vergisi %${KKDF_RATE}`,
												`Güncel BSMV vergisi %${BSMV_RATE}`,
											]}
										/>
									</div>
								</th>
							)}
							<th className='py-3 px-4 font-semibold '>
								<div className='flex items-center justify-center gap-1 w-max'>
									Faiz Oranı
									{!isBankTermDependentRates && (
										<InfoTooltip
											content={[
												`30.000₺'ye kadar ${headerRates.interestRateBelow30k}`,
												`30.000₺'den 180.000₺'ye kadar ${headerRates.interestRate30to180k}`,
												`180.000₺'nin üstü ${headerRates.interestRateAbove180k}`,
												'(Bankalar arası faiz oranları değişebilir.)',
											]}
										/>
									)}
								</div>
							</th>
							<th className='py-3 px-4 font-semibold last:border-r-0 '>
								Toplam Faiz Tutarı
							</th>
						</tr>
					</thead>
					<tbody className='dark:[&>tr:nth-child(even)]:bg-gray-900 [&>tr:nth-child(even)]:bg-gray-200'>
						{rows.map((row) => (
							<tr
								key={row.term}
								className='border-b-2 *:border-r-2 *:border-r-border border-b-border text-text  last:border-b-0'
							>
								<td className='py-3 px-4 text-text '>{row.term}</td>
								<td className='py-3 px-4 text-text '>{row.monthlyPayment}</td>
								<td className='py-3 px-4 text-text '>{row.total}</td>
								{!bank.taxIncluded &&
									row?.totalBsmv != null &&
									row?.totalKkdf != null && (
										<td className='py-3 px-4 text-text  hidden sm:table-cell'>
											{currencyFormatter.format(row.totalBsmv + row.totalKkdf)}
										</td>
									)}
								<td className='py-3 px-4 text-text '>
									<div className='w-max flex items-center'>
										% {row.rate}
										{isBankTermDependentRates && (
											<InfoTooltip
												content={[
													`30.000₺'ye kadar ${headerRates.interestRateBelow30k}`,
													`30.000₺'den 180.000₺'ye kadar ${headerRates.interestRate30to180k}`,
													`180.000₺'nin üstü ${headerRates.interestRateAbove180k}`,
													'(Bankalar arası faiz oranları değişebilir.)',
												]}
											/>
										)}
									</div>
								</td>
								<td className='py-3 px-4 text-text last:border-r-0'>
									{row.totalInterest}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className='sm:hidden text-center text-[10px] text-text/50 py-1 select-none'>
				← Tabloyu kaydırmak için sağa/sola sürükleyin →
			</div>
		</div>
	);
}
