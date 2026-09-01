'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
	content: string[];
}

export default function InfoTooltip({ content }: InfoTooltipProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [coords, setCoords] = useState({ top: 0, left: 0 });
	const ref = useRef<HTMLSpanElement>(null);

	const handleEnter = () => {
		const rect = ref.current?.getBoundingClientRect();
		if (rect) {
			setCoords({
				top: rect.bottom + window.scrollY + 8,
				left: rect.left + rect.width / 2 + window.scrollX,
			});
		}
		setIsHovered(true);
	};
	return (
		<span
			className='w-5 h-5 inline-block ml-1 relative z-50 shrink-0'
			ref={ref}
			onMouseEnter={handleEnter}
			onMouseLeave={() => setIsHovered(false)}
		>
			<svg
				xmlns='http://www.w3.org/2000/svg'
				x='0px'
				y='0px'
				viewBox='0,0,256,256'
				className='z-40'
			>
				<g
					fill='#d1d5dc'
					fillRule='nonzero'
					stroke='none'
					strokeWidth='1'
					strokeLinecap='butt'
					strokeLinejoin='miter'
					strokeMiterlimit='10'
					strokeDasharray=''
					strokeDashoffset='0'
					fontFamily='none'
					fontWeight='none'
					fontSize='none'
				>
					<g transform='scale(10.66667,10.66667)'>
						<path d='M12,2c-5.511,0 -10,4.489 -10,10c0,5.511 4.489,10 10,10c5.511,0 10,-4.489 10,-10c0,-5.511 -4.489,-10 -10,-10zM12,4c4.43012,0 8,3.56988 8,8c0,4.43012 -3.56988,8 -8,8c-4.43012,0 -8,-3.56988 -8,-8c0,-4.43012 3.56988,-8 8,-8zM11,7v2h2v-2zM11,11v6h2v-6z'></path>
					</g>
				</g>
			</svg>

			{isHovered &&
				createPortal(
					<div
						style={{ top: coords.top, left: coords.left }}
						className={`fixed -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-600 px-2 py-1 text-xs text-white shadow-lg z-9999 ${isHovered ? 'animate-appear' : 'animate-disappear'}
`}
					>
						{content.map((line, index) => (
							<span key={index}>
								{line}
								{index < content.length - 1 && <br />}
							</span>
						))}
						<div className='absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-600' />
					</div>,
					document.body,
				)}
		</span>
	);
}
