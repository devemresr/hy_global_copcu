import InventoryPage from './InventoryPage';
import { Routes, Route, Navigate } from 'react-router';
import { TermsPage } from './Terms';
import { AboutPage } from './About';
import { PaymentCalculator } from './PaymentCalculator';
import { Explanation } from './Explanation';
import { Pricing } from './Pricing';
import { UmamiAnalytics } from './component/UmamiAnalytics';
import AdminPage from './Admin';
import { LoginPage } from './Login';

export function App() {
	return (
		<>
			<Routes>
				<Route path='/terms' element={<TermsPage />} />
					<Route path='/hakkimizda' element={<AboutPage />} />
				<Route path='/bilgi' element={<Explanation />} />
				<Route path='/paymentCalculation' element={<PaymentCalculator />} />
				<Route path='/login' element={<LoginPage />} />
				<Route path='/admin' element={<AdminPage />} />
				<Route path='/' element={<InventoryPage />} />
				<Route path='/fiyatlandirma' element={<Pricing />}></Route>
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
			<UmamiAnalytics />
		</>
	);
}
