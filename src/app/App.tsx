import InventoryPage from './InventoryPage';
import { Routes, Route } from 'react-router';
import { TermsPage } from './Terms';
import { PaymentCalculator } from './PaymentCalculator';
import { Explanation } from './Explanation';
import { Pricing } from './Pricing';
import { Analytics } from '@vercel/analytics/react';

export function App() {
	return (
		<>
			<Routes>
				<Route path='/terms' element={<TermsPage />} />
				<Route path='/bilgi' element={<Explanation />} />
				<Route path='/paymentCalculation' element={<PaymentCalculator />} />
				<Route path='/' element={<InventoryPage />} />
				<Route path='/fiyatlandirma' element={<Pricing />}></Route>
			</Routes>
			<Analytics />
		</>
	);
}
