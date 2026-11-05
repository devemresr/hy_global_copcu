import { useState, type ReactNode } from 'react';
import { Pagination } from './Pagination';

export function OrderChartTable({
	title,
	headers,
	rows,
}: {
	title: string;
	headers: string[];
	rows: ReactNode[][];
}) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
	const currentPage = Math.min(page, totalPages);
	return (
		<section className='mt-3 min-w-0 space-y-3 text-sm' aria-label={title}>
			<div className='relative min-w-0 overflow-x-auto overscroll-x-contain'>
				<table className='w-full text-left'>
					<caption className='mb-2 text-left font-medium'>{title}</caption>
					<thead>
						<tr>
							{headers.map((header) => (
								<th key={header} className='p-2'>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows
							.slice((currentPage - 1) * pageSize, currentPage * pageSize)
							.map((row, index) => (
								<tr key={index} className='even:bg-button-bg'>
									{row.map((cell, column) => (
										<td key={column} className='p-2'>
											{cell}
										</td>
									))}
								</tr>
							))}
					</tbody>
				</table>
			</div>
			<Pagination
				page={currentPage}
				totalPages={totalPages}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={(size) => {
					setPageSize(size);
					setPage(1);
				}}
				hideNavWhenSinglePage
				summary={`${rows.length} kayıt`}
			/>
		</section>
	);
}
