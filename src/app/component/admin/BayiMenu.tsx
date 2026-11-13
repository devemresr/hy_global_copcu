import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Check,
	ChevronDown,
	ChevronRight,
	Pencil,
	Plus,
	Square,
	SquareCheck,
} from 'lucide-react';
import { STOCK_CONTROL } from '../../constants/stockStyles.constant';
export type BayiMenuOption = { id: string; label: string };
type Option = BayiMenuOption;
const itemClass =
	'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-button-hover-bg focus-visible:bg-button-hover-bg focus-visible:outline-none disabled:cursor-default disabled:opacity-40';
export function BayiMenu({
	id,
	label,
	value,
	options,
	addOptions = [],
	allLabel,
	disabled,
	canAdd = false,
	onChange,
	onAdd,
	selectedIds,
	onToggle,
	onEdit,
	canEdit,
	onCreate,
	onClear,
	entityType = 'bayi',
}: {
	id: string;
	label: string;
	value: string;
	options: Option[];
	addOptions?: Option[];
	allLabel: string;
	disabled: boolean;
	canAdd?: boolean;
	onChange: (id: string) => void;
	onAdd?: (id: string) => void;
	selectedIds?: string[];
	onToggle?: (id: string) => void;
	onEdit?: (id: string) => void;
	canEdit?: (id: string) => boolean;
	onCreate?: () => void;
	onClear?: () => void;
	entityType?: 'bayi' | 'investor';
}) {
	const menuId = useId();
	const trigger = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const addTrigger = useRef<HTMLButtonElement>(null);
	const submenu = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		left: number;
		top: number;
		maxHeight: number;
		mobile: boolean;
	} | null>(null);
	const [subPosition, setSubPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);
	const [expanded, setExpanded] = useState(false);
	const width = 260;
	function close(focus = true) {
		setPosition(null);
		setExpanded(false);
		setSubPosition(null);
		if (focus) trigger.current?.focus({ preventScroll: true });
	}
	function open() {
		const rect = trigger.current?.getBoundingClientRect();
		if (!rect) return;
		const height = Math.min(
			(options.length + 2) * 40 + 12,
			360,
			window.innerHeight - 16,
		);
		const below = window.innerHeight - rect.bottom - 8;
		const top =
			below >= Math.min(height, 180)
				? rect.bottom + 4
				: Math.max(8, rect.top - height - 4);
		setPosition({
			left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
			top,
			maxHeight: Math.max(100, window.innerHeight - top - 8),
			mobile: window.innerWidth < 640,
		});
		setExpanded(false);
	}
	useEffect(() => {
		if (!position) return;
		menu.current
			?.querySelector<HTMLButtonElement>('button:not(:disabled)')
			?.focus({ preventScroll: true });
		function outside(event: PointerEvent) {
			if (
				!menu.current?.contains(event.target as Node) &&
				!trigger.current?.contains(event.target as Node)
			)
				close(false);
		}
		function dismiss() {
			close(false);
		}
		function scroll(event: Event) {
			if (
				!(event.target instanceof Node) ||
				!menu.current?.contains(event.target)
			)
				close(false);
		}
		window.addEventListener('scroll', scroll, true);
		document.addEventListener('pointerdown', outside);
		window.addEventListener('resize', dismiss);
		return () => {
			document.removeEventListener('pointerdown', outside);
			window.removeEventListener('resize', dismiss);
			window.removeEventListener('scroll', scroll, true);
		};
	}, [position]);
	if (disabled && position) {
		setPosition(null);
		setExpanded(false);
	}
	useLayoutEffect(() => {
		if (!expanded || !position) return;
		const anchor = addTrigger.current?.getBoundingClientRect();
		if (!anchor) return;
		if (!position.mobile)
			setSubPosition({
				left:
					position.left + width * 2 + 12 <= window.innerWidth
						? position.left + width + 4
						: Math.max(8, position.left - width - 4),
				top: Math.max(
					8,
					Math.min(
						anchor.top,
						window.innerHeight - Math.min(addOptions.length * 40 + 16, 320) - 8,
					),
				),
			});
		submenu.current
			?.querySelector<HTMLButtonElement>('button:not(:disabled)')
			?.focus({ preventScroll: true });
	}, [expanded, position, addOptions.length]);
	function keyboard(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}
		if (event.key === 'Tab') {
			close();
			return;
		}
		if (
			event.key === 'ArrowLeft' &&
			submenu.current?.contains(event.target as Node)
		) {
			event.preventDefault();
			setExpanded(false);
			addTrigger.current?.focus();
			return;
		}
		if (event.key === 'ArrowRight' && event.target === addTrigger.current) {
			event.preventDefault();
			if (canAdd) setExpanded(true);
			return;
		}
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		const root = (event.target as HTMLElement).closest('[role=menu]');
		const buttons = [
			...(root?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ??
				[]),
		];
		const ownButtons = buttons.filter(
			(button) => button.closest('[role=menu]') === root,
		);
		const index = ownButtons.indexOf(
			document.activeElement as HTMLButtonElement,
		);
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? ownButtons.length - 1
					: (index + (event.key === 'ArrowDown' ? 1 : -1) + ownButtons.length) %
						ownButtons.length;
		ownButtons[next]?.focus();
	}
	const selected = selectedIds
		? selectedIds.length
			? selectedIds.length === 1
				? (options.find((option) => option.id === selectedIds[0])?.label ??
					'1 bayi seçildi')
				: selectedIds.length + ' bayi seçildi'
			: allLabel
		: (options.find((option) => option.id === value)?.label ??
			(value
				? entityType === 'bayi'
					? 'Seçili bayi listede bulunamadı'
					: 'Seçili yatırımcı listede bulunamadı'
				: allLabel));
	function editButton(option: Option) {
		return onEdit ? (
			<button
				type='button'
				role='menuitem'
				aria-label={
					option.label +
					(entityType === 'bayi'
						? ' bayisini düzenle'
						: ' yatırımcısını düzenle')
				}
				title={entityType === 'bayi' ? 'Bayiyi düzenle' : 'Yatırımcıyı düzenle'}
				disabled={canEdit && !canEdit(option.id)}
				className='mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-button-hover-bg disabled:opacity-40'
				onClick={() => {
					close(false);
					onEdit(option.id);
				}}
			>
				<Pencil size={15} aria-hidden />
			</button>
		) : null;
	}
	return (
		<>
			<button
				id={id}
				ref={trigger}
				type='button'
				aria-label={label}
				aria-haspopup='menu'
				aria-expanded={!!position}
				aria-controls={position ? menuId : undefined}
				disabled={disabled}
				className={
					STOCK_CONTROL +
					' flex h-9! w-full! items-center justify-between gap-2 text-left'
				}
				onClick={() => (position ? close() : open())}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown') {
						event.preventDefault();
						open();
					}
				}}
			>
				<span className='min-w-0 truncate'>{selected}</span>
				<ChevronDown size={14} className='shrink-0' aria-hidden />
			</button>
			{position &&
				createPortal(
					<div
						ref={menu}
						onKeyDown={keyboard}
						style={{
							position: 'fixed',
							left: position.left,
							top: position.top,
							width: 'min(260px, calc(100vw - 16px))',
							zIndex: 100,
						}}
					>
						<div
							role='menu'
							id={menuId}
							aria-label={label}
							className='overflow-y-auto rounded-xl border border-border bg-modal-bg p-1 text-text shadow-xl'
							style={{ maxHeight: position.maxHeight }}
						>
							{(selectedIds ? selectedIds.length > 0 : Boolean(value)) &&
								onClear && (
									<button
										type='button'
										role='menuitem'
										className={itemClass}
										onClick={onClear}
									>
										Seçimi temizle
									</button>
								)}
							{options.map((option) => {
								const checked = selectedIds
									? selectedIds.includes(option.id)
									: value === option.id;
								return (
									<div
										key={option.id}
										role='none'
										className='flex items-center gap-1'
									>
										<button
											type='button'
											role={selectedIds ? 'menuitemcheckbox' : 'menuitemradio'}
											aria-checked={checked}
											className={itemClass + ' min-w-0 flex-1'}
											onClick={() => {
												if (selectedIds) {
													onToggle?.(option.id);
												} else {
													onChange(option.id);
													close();
												}
											}}
										>
											{selectedIds &&
												(checked ? (
													<SquareCheck
														size={16}
														className='shrink-0'
														aria-hidden
													/>
												) : (
													<Square size={16} className='shrink-0' aria-hidden />
												))}
											<span className='min-w-0 flex-1 break-words'>
												{option.label}
											</span>
											{!selectedIds && checked && (
												<Check size={14} aria-hidden />
											)}
										</button>
										{editButton(option)}
									</div>
								);
							})}
							{onCreate && (
								<>
									<div
										role='separator'
										className='my-1 border-t border-border'
									/>
									<button
										type='button'
										role='menuitem'
										className={itemClass}
										onClick={() => {
											close(false);
											onCreate();
										}}
									>
										<Plus size={16} aria-hidden />
										{entityType === 'bayi' ? 'Bayi ekle' : 'Yatırımcı ekle'}
									</button>
								</>
							)}

							{onAdd && (
								<>
									<div
										role='separator'
										className='my-1 border-t border-border'
									/>
									<button
										ref={addTrigger}
										type='button'
										role='menuitem'
										aria-haspopup='menu'
										aria-expanded={expanded}
										aria-controls={expanded ? menuId + '-more' : undefined}
										disabled={!canAdd}
										className={itemClass}
										onClick={() => setExpanded((current) => !current)}
									>
										<span className='flex-1'>Başka bayiden sat</span>
										<ChevronRight
											size={15}
											className={position.mobile && expanded ? 'rotate-90' : ''}
											aria-hidden
										/>
									</button>
									{expanded && (
										<div
											ref={submenu}
											role='menu'
											id={menuId + '-more'}
											aria-label='Satışa eklenecek bayi'
											className={
												'overflow-y-auto rounded-lg border border-border bg-modal-bg p-1 text-text ' +
												(position.mobile ? 'mx-2 my-1' : 'fixed shadow-xl')
											}
											style={
												position.mobile
													? { maxHeight: 240 }
													: {
															left: subPosition?.left ?? position.left,
															top: subPosition?.top ?? position.top,
															width,
															maxHeight: 'min(320px, calc(100dvh - 16px))',
														}
											}
										>
											{addOptions.map((option) => (
												<div
													key={option.id}
													role='none'
													className='flex items-center gap-1'
												>
													<button
														type='button'
														role='menuitem'
														className={itemClass}
														onClick={() => {
															onAdd?.(option.id);
															close();
														}}
													>
														{option.label}
													</button>
													{editButton(option)}
												</div>
											))}
										</div>
									)}
								</>
							)}
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}
