import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import { BAYI_ROUTES } from '../../../constants/routes.constant';
import {
	bayiConflictSchema,
	type Bayi,
	type BayiInput,
} from '../../../schemas/bayi.schema';
export type { Bayi } from '../../../schemas/bayi.schema';

export function useBayiler(enabled = true) {
	return useQuery<{ bayiler: Bayi[] }, ApiError>({
		queryKey: ['bayiler'],
		enabled,
		queryFn: () => apiFetch(BAYI_ROUTES.LIST),
		retry: false,
	});
}

export function useSaveBayi() {
	const client = useQueryClient();
	function cache(entries: Bayi[]) {
		client.setQueryData<{ bayiler: Bayi[] }>(['bayiler'], (current) => {
			const records = new Map(
				(current?.bayiler ?? []).map((entry) => [entry._id, entry]),
			);
			for (const entry of entries) records.set(entry._id, entry);
			return {
				bayiler: [...records.values()].sort((a, b) =>
					a.name.localeCompare(b.name, 'tr'),
				),
			};
		});
	}
	return useMutation<
		{ bayi: Bayi },
		ApiError,
		{ id?: string; input: BayiInput }
	>({
		mutationFn: ({ id, input }) =>
			apiFetch(id ? BAYI_ROUTES.UPDATE(id) : BAYI_ROUTES.CREATE, {
				method: id ? 'PATCH' : 'POST',
				body: input,
			}),
		onSuccess: ({ bayi }) => {
			cache([bayi]);
			void client.invalidateQueries({ queryKey: ['bayiler'] });
		},
		onError: (error) => {
			const conflict = bayiConflictSchema.safeParse(error.details);
			if (conflict.success) {
				cache(conflict.data.matches.map((match) => match.bayi));
				void client.invalidateQueries({ queryKey: ['bayiler'] });
			}
		},
	});
}
