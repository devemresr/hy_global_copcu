import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Copy, ClipboardPaste, X } from 'lucide-react';
import { useWindowSize } from '../../hooks/useWindowSize';
import {
	BOOKMARKS_KEY, parseSharedFilter, readFilterBookmarks, serializeFilter,
	type FilterBookmark, type SavedCondition,
} from '../../helpers/adminPageHelpers/savedFilters.helper';

function FilterDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	return (
		<dialog ref={dialogRef} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className='fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-xl bg-modal-bg p-4 text-text backdrop:bg-black/50'>
			<div className='mb-3 flex items-center justify-between gap-2'>
				<h3 className='font-semibold'>{title}</h3>
				<button type='button' aria-label='Kapat' onClick={onClose}><X size={18} /></button>
			</div>
			{children}
		</dialog>
	);
}

export function FilterWorkspace({ conditions, onLoad, children }: {
	conditions: SavedCondition[];
	onLoad: (conditions: SavedCondition[]) => void;
	children: ReactNode;
}) {
	const [bookmarks, setBookmarks] = useState(readFilterBookmarks);
	const [bookmarksOpen, setBookmarksOpen] = useState(false);
	const [name, setName] = useState('');
	const [transfer, setTransfer] = useState<'copy' | 'paste' | null>(null);
	const [transferText, setTransferText] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const { width } = useWindowSize();
	const desktop = width >= 1024;
	const buttonClass = 'flex items-center gap-1 rounded-lg bg-button-focus-bg px-2 py-1.5 text-xs hover:bg-button-hover-bg';

	function persist(next: FilterBookmark[]) {
		try {
			localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
			setBookmarks(next);
			setError('');
			return true;
		} catch {
			setError('Yer imleri kaydedilemedi. Tarayıcı depolamasını kontrol edin.');
			return false;
		}
	}
	function saveBookmark() {
		try {
			if (!name.trim()) throw new Error('Yer imi için bir ad girin.');
			const snapshot = parseSharedFilter(serializeFilter(conditions));
			const next = [...bookmarks, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim(), conditions: snapshot }];
			if (persist(next)) { setName(''); setMessage('Filtre yer imlerine kaydedildi.'); }
		} catch {
			setError('Bir ad ve en az bir tamamlanmış filtre koşulu girin.');
		}
	}
	async function copyFilter() {
		setError('');
		try {
			const text = serializeFilter(conditions);
			try {
				await navigator.clipboard.writeText(text);
				setMessage('Filtre kopyalandı.');
			} catch {
				setTransferText(text);
				setTransfer('copy');
			}
		} catch { setError('Kopyalamak için en az bir tamamlanmış filtre koşulu girin.'); }
	}
	const bookmarkContent = (
		<div className='flex flex-col gap-3'>
			<p className='text-xs opacity-60'>Filtreler bu tarayıcıda saklanır. Yüklemek yalnızca koşulları değiştirir.</p>
			<label className='flex flex-col gap-1 text-xs'>Yer imi adı
				<input maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className='min-w-0 rounded-lg bg-button-focus-bg px-2 py-2' />
			</label>
			<button type='button' onClick={saveBookmark} className={buttonClass}>Geçerli filtreyi kaydet</button>
			{bookmarks.length === 0 && <p className='text-xs opacity-60'>Henüz kayıtlı filtre yok.</p>}
			<ul className='flex max-h-[50dvh] flex-col gap-2 overflow-y-auto'>
				{bookmarks.map((bookmark) => (
					<li key={bookmark.id} className='flex items-center justify-between gap-2 rounded-lg bg-button-focus-bg p-2'>
						<button type='button' className='min-w-0 flex-1 break-words text-left text-xs' onClick={() => { onLoad(bookmark.conditions); setMessage(`${bookmark.name} filtresi yüklendi.`); setBookmarksOpen(false); }}>{bookmark.name}</button>
						<button type='button' aria-label={`${bookmark.name} yer imini sil`} onClick={() => persist(bookmarks.filter((item) => item.id !== bookmark.id))}><X size={14} /></button>
					</li>
				))}
			</ul>
			{error && <p role='alert' className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
		</div>
	);
	return (
		<div className={`grid min-w-0 gap-4 ${desktop && bookmarksOpen ? 'lg:grid-cols-[minmax(0,1fr)_18rem]' : 'grid-cols-1'}`}>
			<div className='flex min-w-0 flex-col gap-3'>
				<div className='flex flex-wrap gap-2'>
					<button type='button' className={buttonClass} aria-expanded={bookmarksOpen} onClick={() => { setError(''); setBookmarksOpen((open) => !open); }}><Bookmark size={14} />Filtre yer imleri</button>
					<button type='button' className={buttonClass} onClick={() => void copyFilter()}><Copy size={14} />Filtreyi kopyala</button>
					<button type='button' className={buttonClass} onClick={() => { setError(''); setTransferText(''); setTransfer('paste'); }}><ClipboardPaste size={14} />Filtre yapıştır</button>
				</div>
				{message && <p role='status' className='text-xs opacity-70'>{message}</p>}
				{error && !bookmarksOpen && !transfer && <p role='alert' className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
				{children}
			</div>
			{bookmarksOpen && (desktop ? (
				<aside aria-label='Filtre yer imleri' className='self-start rounded-xl border border-border p-3'>
					<div className='mb-3 flex items-center justify-between'><h3 className='font-semibold'>Filtre yer imleri</h3><button type='button' aria-label='Yer imlerini kapat' onClick={() => setBookmarksOpen(false)}><X size={16} /></button></div>
					{bookmarkContent}
				</aside>
			) : <FilterDialog title='Filtre yer imleri' onClose={() => setBookmarksOpen(false)}>{bookmarkContent}</FilterDialog>)}
			{transfer && <FilterDialog title={transfer === 'paste' ? 'Filtre yapıştır' : 'Filtreyi kopyala'} onClose={() => setTransfer(null)}>
				<p className='mb-2 text-xs opacity-70'>{transfer === 'paste' ? 'Kopyaladığınız filtreyi buraya yapıştırın ve yükleyin.' : 'Metnin tamamını seçip kopyalayın.'}</p>
				<textarea aria-label='Filtre metni' rows={8} value={transferText} readOnly={transfer === 'copy'} onFocus={(event) => { if (transfer === 'copy') event.target.select(); }} onChange={(event) => setTransferText(event.target.value)} className='w-full rounded-lg bg-button-focus-bg p-2 font-mono text-xs' />
				{error && <p role='alert' className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
				{transfer === 'paste' && <button type='button' className={buttonClass} onClick={() => {
					try { onLoad(parseSharedFilter(transferText)); setError(''); setTransfer(null); setMessage('Filtre yüklendi.'); }
					catch { setError('Filtre metni geçersiz. Kopyalanan metnin tamamını yapıştırın.'); }
				}}>Filtreyi yükle</button>}
			</FilterDialog>}
		</div>
	);
}
