import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ITEM_RULE_ROUTES } from '../constants/routes.constant';
import { apiFetch, type ApiError } from './api/core/api-client';
import { ITEM_RULES_KEY, loadItemRules, validateItemRule, type ItemRule } from '../helpers/adminPageHelpers/itemRules.helper';

type RulesResponse = { success: boolean; rules: ItemRule[]; revision: number };
const queryKey = ['itemRules'] as const;

export function useItemRules() {
	const client = useQueryClient();
	const [legacyRules, setLegacyRules] = useState(loadItemRules);
	const saving = useRef(false);
	const query = useQuery<RulesResponse, ApiError>({
		queryKey,
		queryFn: () => apiFetch<RulesResponse>(ITEM_RULE_ROUTES.LIST),
		refetchOnWindowFocus: true,
	});
	const mutation = useMutation<RulesResponse, ApiError, { rules: ItemRule[]; revision: number }>({
		mutationFn: (body) => apiFetch<RulesResponse>(ITEM_RULE_ROUTES.SAVE, { method: 'PUT', body }),
		onSuccess: (data) => {
			client.setQueryData(queryKey, data);
			void client.invalidateQueries({ queryKey: ['logEvents'] });
			toast.success('Kurallar kaydedildi');
		},
		onError: (error) => {
			if (error.status === 409) void client.invalidateQueries({ queryKey });
			toast.error('Kurallar kaydedilemedi', { description: error.message });
		},
	});
	async function saveRules(next: ItemRule[]) {
		if (!query.data || query.isError) throw new Error('Kurallar yüklenemedi. Önce listeyi yenileyin.');
		if (saving.current) throw new Error('Bir kural işlemi zaten sürüyor.');
		saving.current = true;
		try { await mutation.mutateAsync({ rules: next.map(validateItemRule), revision: query.data.revision }); }
		finally { saving.current = false; }
	}
	async function importLegacyRules() {
		const current = query.data?.rules ?? [];
		await saveRules([...current, ...legacyRules.filter((rule) => !current.some((saved) => saved.id === rule.id))]);
		try { localStorage.removeItem(ITEM_RULES_KEY); } catch { /* Server copy is already saved. */ }
		setLegacyRules([]);
	}
	return {
		rules: query.data?.rules ?? [], saveRules, legacyRules, importLegacyRules,
		isLoading: query.isPending, isSaving: mutation.isPending,
		error: query.error, refetch: query.refetch,
	};
}
