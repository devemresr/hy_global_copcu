import { RecordEditorModal } from './RecordEditorModal';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	useInvestors,
	type Investor,
} from '../../hooks/api/endpoints/useInvestors';
import { useFinanceMutation } from '../../hooks/api/endpoints/useFinance';
import { STOCK_CONTROL } from '../../constants/stockStyles.constant';

function InvestorEditor({
	investor,
	onClose,
	onSaved,
}: {
	investor: Investor | null;
	onClose: () => void;
	onSaved: (investor: Investor) => void;
}) {
	const client = useQueryClient();
	const save = useFinanceMutation<{
		requestId: string;
		name: string;
		phone: string;
	}>(
		investor ? '/finance/investors/' + investor._id : '/finance/investors',
		investor ? 'PUT' : 'POST',
	);
	return (
		<RecordEditorModal
			title={investor ? 'Yatırımcıyı düzenle' : 'Yatırımcı ekle'}
			initialValues={{
				name: investor?.name ?? '',
				phone: (investor?.phone ?? '').replace(/\D/g, ''),
			}}
			fields={[
				{ key: 'name', label: 'Yatırımcı adı' },
				{
					key: 'phone',
					label: 'Telefon numarası',
					type: 'phone',
					autoComplete: 'tel',
				},
			]}
			onClose={onClose}
			onSave={async (values, requestId) => {
				const result = (await save.mutateAsync({
					requestId,
					name: values.name,
					phone: values.phone,
				})) as { investor: Investor; existing: boolean };
				client.setQueryData<{ investors: Investor[] }>(
					['finance', 'investors'],
					(old) => ({
						investors: [
							...(old?.investors ?? []).filter(
								(record) => record._id !== result.investor._id,
							),
							result.investor,
						],
					}),
				);
				onSaved(result.investor);
				if (result.existing)
					toast.info('Mevcut yatırımcı seçildi', {
						description: result.investor.name,
					});
				else
					toast.success(
						investor ? 'Yatırımcı güncellendi' : 'Yatırımcı eklendi',
					);
			}}
		/>
	);
}

export function InvestorPicker({
	value,
	onChange,
	disabled,
}: {
	value: string;
	onChange: (id: string) => void;
	disabled: boolean;
}) {
	const list = useInvestors();
	const [editor, setEditor] = useState<{ investor: Investor | null } | null>(
		null,
	);
	const selected = list.data?.investors.find(
		(investor) => investor._id === value,
	);
	return (
		<div className='min-w-0 space-y-1'>
			<label className='flex flex-col gap-1 text-xs'>
				Yatırımcı
				<select
					className={`${STOCK_CONTROL} w-auto! max-w-64`}
					aria-label='Yatırımcı seçin'
					value={value}
					disabled={disabled || list.isPending || list.isError}
					required
					onChange={(event) => {
						if (event.target.value === '__add_investor__')
							setEditor({ investor: null });
						else onChange(event.target.value);
					}}
				>
					<option value='' disabled hidden>
						{list.isPending ? 'Yatırımcılar yükleniyor...' : 'Yatırımcı seçin'}
					</option>
					{[...(list.data?.investors ?? [])]
						.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
						.map((investor) => (
							<option key={investor._id} value={investor._id}>
								{investor.name}
							</option>
						))}
					<option value='__add_investor__'>+ Yatırımcı ekle</option>
				</select>
			</label>
			{selected && (
				<button
					type='button'
					className='inline-flex items-center gap-1 text-xs underline'
					disabled={disabled}
					onClick={() => setEditor({ investor: selected })}
				>
					<Pencil size={13} aria-hidden />
					{selected.phone ? 'Yatırımcıyı düzenle' : 'Telefon numarası ekle'}
				</button>
			)}
			{list.isError && (
				<p role='alert' className='text-xs text-red-500'>
					Yatırımcılar yüklenemedi.{' '}
					<button
						type='button'
						className='underline'
						onClick={() => void list.refetch()}
					>
						Tekrar dene
					</button>
				</p>
			)}
			{editor && (
				<InvestorEditor
					investor={editor.investor}
					onClose={() => setEditor(null)}
					onSaved={(investor) => {
						onChange(investor._id);
						setEditor(null);
					}}
				/>
			)}
		</div>
	);
}
