import { RecordEditorModal } from './RecordEditorModal';
import { BayiMenu } from './BayiMenu';
import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	useInvestors,
	type Investor,
} from '../../hooks/api/endpoints/useInvestors';
import { useFinanceMutation } from '../../hooks/api/endpoints/useFinance';

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
	disabled = false,
	allowCreate = true,
	compact = false,
	label = 'Yatırımcı seçin',
	allowClear = false,
}: {
	value: string;
	onChange: (id: string) => void;
	disabled?: boolean;
	allowCreate?: boolean;
	compact?: boolean;
	label?: string;
	allowClear?: boolean;
}) {
	const id = useId();
	const list = useInvestors();
	const [editor, setEditor] = useState<{ investor: Investor | null } | null>(
		null,
	);
	const investors = [...(list.data?.investors ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name, 'tr'),
	);
	return (
		<div className='min-w-0 space-y-1'>
			{!compact && (
				<label htmlFor={id} className='block text-xs'>
					Yatırımcı
				</label>
			)}
			<BayiMenu
				id={id}
				entityType='investor'
				label={label}
				value={value}
				options={investors.map((investor) => ({
					id: investor._id,
					label: investor.name,
				}))}
				allLabel={
					list.isPending ? 'Yatırımcılar yükleniyor...' : 'Yatırımcı seçin'
				}
				disabled={disabled || list.isPending || list.isError}
				onChange={onChange}
				onClear={allowClear ? () => onChange('') : undefined}
				onCreate={allowCreate ? () => setEditor({ investor: null }) : undefined}
				onEdit={(id) => {
					const investor = investors.find((row) => row._id === id);
					if (investor) setEditor({ investor });
				}}
			/>
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
						if (!editor.investor) onChange(investor._id);
						setEditor(null);
					}}
				/>
			)}
		</div>
	);
}
