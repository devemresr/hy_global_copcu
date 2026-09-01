import InventoryPage from './InventoryPage';
import { Routes, Route } from 'react-router';
import { TermsPage } from './Terms';
import { PaymentCalculator } from './PaymentCalculator';

export function App() {
	return (
		<Routes>
			<Route path='/' element={<InventoryPage />} />
			<Route path='/terms' element={<TermsPage />} />
			<Route path='/paymentCalculation' element={<PaymentCalculator />} />
		</Routes>
	);
}
