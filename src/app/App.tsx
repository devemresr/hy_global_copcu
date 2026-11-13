import SalesPage from './Sales';
import InventoryPage from './InventoryPage';
import { Routes, Route, Navigate } from 'react-router';
import { TermsPage } from './Terms';
import { AboutPage } from './About';
import { PaymentCalculator } from './PaymentCalculator';
import { Explanation } from './Explanation';
import { Pricing } from './Pricing';
import { UmamiAnalytics } from './component/UmamiAnalytics';
import AdminPage from './Admin';
import PurchasesPage from './Purchases';
import StockPage from './Stock';
import BalancePage from './Balance';
import AnalysisPage from './Analysis';
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
				<Route path={PAGE_PATHS.PURCHASES} element={<PurchasesPage />} />
				<Route path={PAGE_PATHS.SALES} element={<SalesPage />} />
				<Route path={PAGE_PATHS.STOCK} element={<StockPage />} />
				<Route path={PAGE_PATHS.BALANCE} element={<BalancePage />} />
				<Route path={PAGE_PATHS.ANALYSIS} element={<AnalysisPage />} />
				<Route
					path={`${PAGE_PATHS.ADMIN}/siparis`}
					element={<Navigate to={PAGE_PATHS.PURCHASES} replace />}
				/>
				<Route path={PAGE_PATHS.HOME} element={<InventoryPage />} />
				<Route path={PAGE_PATHS.PRICING} element={<Pricing />} />
				<Route path='*' element={<Navigate to={PAGE_PATHS.HOME} replace />} />
			</Routes>
			<UmamiAnalytics />
		</>
	);
}
