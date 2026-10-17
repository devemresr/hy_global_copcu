import { describe, expect, it } from 'vitest';
import { matchesFieldFilter, type FieldFilterOp } from '../app/helpers/inventoryPageHelpers/fieldFilter.helper';
import { filterOpsForField } from '../app/constants/fieldRegistry.constant';
import { parseSharedFilter, serializeFilter } from '../app/helpers/adminPageHelpers/savedFilters.helper';

describe('model length filters', () => {
	it('compares the trimmed character count, including Unicode characters', () => {
		for (const model of ['ABC', ' ABC ', 'İŞ😀']) expect(matchesFieldFilter({ model }, { field: 'model', op: 'lengthEquals', value: '3' })).toBe(true);
		expect(matchesFieldFilter({ model: 'ABCD' }, { field: 'model', op: 'lengthEquals', value: '3' })).toBe(false);
	});
	it('supports greater/less comparisons and inclusive boundaries', () => {
		for (const [op, expected] of [['lengthGt', false], ['lengthGte', true], ['lengthLt', false], ['lengthLte', true]] as [FieldFilterOp, boolean][]) {
			expect(matchesFieldFilter({ model: 'ABC' }, { field: 'model', op, value: 3 })).toBe(expected);
		}
		expect(matchesFieldFilter({ model: 'AB' }, { field: 'model', op: 'lengthLt', value: 3 })).toBe(true);
	});
	it('offers length operators only for models and rejects invalid lengths', () => {
		expect(filterOpsForField('model')).toContain('lengthEquals');
		expect(filterOpsForField('bellekTipi')).not.toContain('lengthEquals');
		expect(matchesFieldFilter({ bellekTipi: 'UFS' }, { field: 'bellekTipi', op: 'lengthEquals', value: 3 })).toBe(false);
		for (const value of ['', 'abc', '3.5', '-1', -1, true, null]) expect(matchesFieldFilter({ model: 'ABC' }, { field: 'model', op: 'lengthEquals', value })).toBe(false);
		expect(matchesFieldFilter({}, { field: 'model', op: 'lengthEquals', value: 0 })).toBe(false);
	});
	it('round trips through bookmarks and clipboard filters with field restrictions intact', () => {
		const conditions = [{ field: 'model' as const, op: 'lengthEquals' as const, value: '3' }];
		expect(parseSharedFilter(serializeFilter(conditions))).toEqual(conditions);
		expect(() => serializeFilter([{ field: 'bellekTipi', op: 'lengthEquals', value: '3' }])).toThrow();
		expect(() => serializeFilter([{ field: 'model', op: 'lengthEquals', value: '3.5' }])).toThrow();
	});
});
