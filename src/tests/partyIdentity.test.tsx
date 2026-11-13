import {
	chooseBayiOption,
	openBayiMenu,
	closeBayiMenu,
} from './bayiMenu.helpers';
import { afterEach, it, expect, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PartyName } from '../app/component/admin/PartyName';
import { ReportFilters } from '../app/component/admin/ReportFilters';
import type { FinanceFilters } from '../app/hooks/api/endpoints/useFinance';
const parties = vi.hoisted(() => ({
	bayiler: [{ _id: '000000000000000000000001', name: 'Eski bayi' }],
	investors: [
		{ _id: '00000000-0000-4000-8000-000000000001', name: 'Yeni yatırımcı' },
	],
}));
vi.mock('../app/hooks/api/endpoints/useBayiler', () => ({
	useBayiler: () => ({ data: { bayiler: parties.bayiler }, isError: false }),
}));
vi.mock('../app/hooks/api/endpoints/useInvestors', () => ({
	useInvestors: () => ({
		data: { investors: parties.investors },
		isError: false,
	}),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	parties.bayiler[0].name = 'Eski bayi';
});
function setup() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
}
it('shows the current identity alongside the immutable historical name', () => {
	setup();
	act(() =>
		root.render(
			<PartyName label='Bayi' name='Eski bayi' currentName='Yeni bayi' />,
		),
	);
	expect(container.textContent).toContain('Bayi: Yeni bayi');
	expect(container.textContent).toContain('İşlem sırasında: Eski bayi');
	act(() =>
		root.render(
			<PartyName
				label='Yatırımcı'
				name='Eski yatırımcı'
				currentName='Yeni yatırımcı'
			/>,
		),
	);
	expect(container.textContent).toContain('Yatırımcı: Yeni yatırımcı');
	expect(container.textContent).toContain('İşlem sırasında: Eski yatırımcı');
	act(() => root.render(<PartyName name='Silinen bayi' />));
	expect(container.textContent).toBe('Silinen bayi');
});
it('submits permanent IDs, keeps the selection after a rename and removes identity filters independently', () => {
	setup();
	const changed = vi.fn();
	function Harness() {
		const [value, setValue] = useState<FinanceFilters>({});
		return (
			<ReportFilters
				value={value}
				reportKind='balance'
				onChange={(next) => {
					setValue(next);
					changed(next);
				}}
			/>
		);
	}
	act(() => root.render(<Harness />));
	const choose = (selector: string, value: string) =>
		act(() => {
			const select = container.querySelector<HTMLSelectElement>(selector)!;
			select.value = value;
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
	chooseBayiOption('Rapor bayi filtresi', 'Eski bayi');
	act(() =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(changed).toHaveBeenLastCalledWith(
		expect.objectContaining({ bayiIds: [parties.bayiler[0]._id] }),
	);
	expect(changed.mock.lastCall![0].bayiName).toBeUndefined();
	parties.bayiler[0].name = 'Yeni bayi';
	act(() => root.render(<Harness />));
	openBayiMenu('Rapor bayi filtresi');
	expect(
		document.querySelector('[role=menuitemcheckbox][aria-checked=true]')!
			.textContent,
	).toBe('Yeni bayi');
	closeBayiMenu();
	expect(container.querySelector('[role=status]')!.textContent).toContain(
		'Bayi: Yeni bayi',
	);
	act(() =>
		container
			.querySelector<HTMLButtonElement>(
				'[aria-label="Bayi: Yeni bayi filtresini kaldır"]',
			)!
			.click(),
	);
	expect(changed.mock.lastCall![0].bayiIds).toBeUndefined();
	expect(changed.mock.lastCall![0].bayiId).toBeUndefined();
	choose('[aria-label="Rapor yatırımcı filtresi"]', parties.investors[0]._id);
	expect(changed.mock.lastCall![0].investorId).toBe(parties.investors[0]._id);
	expect(changed.mock.lastCall![0].bayiName).toBeUndefined();
});
