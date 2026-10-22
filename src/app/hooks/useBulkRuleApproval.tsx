import { useEffect, useRef, useState } from 'react';
import type { BulkRuleConflict } from '../helpers/adminPageHelpers/itemRules.helper';
import { fieldLabel } from '../constants/fieldRegistry.constant';
import { ConfirmDialog } from '../component/admin/ConfirmDialog';
import { DisplayValue } from '../component/admin/DisplayValue';

export type BulkRuleDecision = 'override' | 'exclude' | 'cancel';

export function useBulkRuleApproval(escapeEnabled: boolean) {
	const [conflicts, setConflicts] = useState<BulkRuleConflict[]>([]);
	const resolveRef = useRef<((decision: BulkRuleDecision) => void) | null>(null);
	useEffect(() => () => { resolveRef.current?.('cancel'); }, []);
	function finish(decision: BulkRuleDecision) {
		const resolve = resolveRef.current;
		resolveRef.current = null; setConflicts([]); resolve?.(decision);
	}
	function requestApproval(next: BulkRuleConflict[]): Promise<BulkRuleDecision> {
		if (resolveRef.current) return Promise.resolve('cancel');
		setConflicts(next);
		return new Promise((resolve) => { resolveRef.current = resolve; });
	}
	const dialog = conflicts.length > 0 ? <ConfirmDialog
		danger
		title='Uyarı: Ürün kurallarıyla çelişen değişiklik'
		confirmLabel='Kurala rağmen uygula'
		cancelLabel='Vazgeç'
		additionalAction={{ label: 'Çelişenleri atla ve uygula', onClick: () => finish('exclude') }}
		enterEnabled={false}
		escapeEnabled={escapeEnabled}
		message={<div className='min-w-0 text-sm'>
			<p className='mb-3 font-medium text-red-600 dark:text-red-400'>Bu toplu değişiklik {new Set(conflicts.map((conflict) => conflict.model)).size} model için kural değerinin dışına çıkıyor. Yine de uygulamak istiyor musunuz?</p>
			<ul className='max-h-[45dvh] space-y-3 overflow-y-auto [overflow-wrap:anywhere]'>{conflicts.map((conflict, index) => <li key={index} className='rounded-lg border border-red-500/40 p-2'>
				<b>{conflict.model}</b><p className='text-xs opacity-70'>Kural: {conflict.ruleName}</p>
				<p>{fieldLabel(conflict.field)}: kural değeri <DisplayValue value={conflict.ruleValue} /> → istenen <DisplayValue value={conflict.requestedValue} /></p>
			</li>)}</ul>
			<p className='mt-3 text-xs'>Çelişenleri atlarsanız yalnızca kalan ürünler güncellenir. Kurala rağmen uygularsanız listedeki ürünler de değiştirilir. Kuralın kendisi değiştirilmez.</p>
		</div>}
		onCancel={() => finish('cancel')}
		onConfirm={() => finish('override')}
	/> : null;
	return { requestApproval, dialog };
}
