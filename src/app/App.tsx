import InventoryPage from './InventoryPage';
import { Routes, Route } from 'react-router';
import { TermsPage } from './Terms';
import { PaymentCalculator } from './PaymentCalculator';
import Explanation from './Explanation';
import AdminPage from './Admin';

export function App() {
	return (
		<Routes>
			<Route path='/terms' element={<TermsPage />} />
			<Route path='/bilgi' element={<Explanation />} />
			<Route path='/paymentCalculation' element={<PaymentCalculator />} />
			<Route path='/admin' element={<AdminPage />} />
			<Route path='/:detayliData?' element={<InventoryPage />} />
		</Routes>
	);
}
