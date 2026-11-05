import InventoryPage from './InventoryPage';
import { Routes, Route, Navigate } from 'react-router';
import { TermsPage } from './Terms';
import { AboutPage } from './About';
import { PaymentCalculator } from './PaymentCalculator';
import { Explanation } from './Explanation';
import { Pricing } from './Pricing';
import { UmamiAnalytics } from './component/UmamiAnalytics';
import AdminPage from './Admin';
import OrdersPage from './Orders';
import StockPage from './Stock';
import { LoginPage } from './Login';
import { PAGE_PATHS } from './constants/pagePaths.constant';

export function App() {
	return (
		<>
			<Routes>
				<Route path={PAGE_PATHS.TERMS} element={<TermsPage />} />
				<Route path={PAGE_PATHS.ABOUT} element={<AboutPage />} />
				<Route path={PAGE_PATHS.INFO} element={<Explanation />} />
				<Route
					path={PAGE_PATHS.PAYMENT_CALCULATION}
					element={<PaymentCalculator />}
				/>
				<Route path={PAGE_PATHS.LOGIN} element={<LoginPage />} />
				<Route path={PAGE_PATHS.ADMIN} element={<AdminPage />} />
				<Route path={PAGE_PATHS.ORDERS} element={<OrdersPage />} />
				<Route path={PAGE_PATHS.STOCK} element={<StockPage />} />
				<Route
					path={`${PAGE_PATHS.ADMIN}/siparis`}
					element={<Navigate to={PAGE_PATHS.ORDERS} replace />}
				/>
				<Route path={PAGE_PATHS.HOME} element={<InventoryPage />} />
				<Route path={PAGE_PATHS.PRICING} element={<Pricing />} />
				<Route path='*' element={<Navigate to={PAGE_PATHS.HOME} replace />} />
			</Routes>
			<UmamiAnalytics />
		</>
	);
}
