import WhatsappIcon from '../assets/icons/icons8-whatsapp.svg?react';
import EmailIcon from '../assets/icons/emailIcon.svg?react';
import { mailUrl, whatsappUrl } from '../url.constant';
import '../App.css';
import { LOGO } from '../assets/photos/photos';

export function Footer() {
	return (
		<footer className='mt-16 md:mt-30'>
			<div className='bg-footer-bg px-5 py-6 sm:px-8 sm:py-10 md:px-12 md:py-12 flex flex-col gap-2  lg:px-10 border-t-2 border-border'>
				<div className='flex flex-col md:flex-row  md:justify-between gap-2'>
					<div className='self-start w-fit mx-auto md:mx-0 md:self-autopx-2 py-2'>
						<img className='w-25 h-25' src={LOGO.url} alt={LOGO.alt}></img>
					</div>

					<div className='flex flex-col md:flex-row gap-2 items-center'>
						<nav className='flex flex-wrap gap-2 mx-auto '>
							<a
								href='/fiyatlandirma'
								className='text-sm text-text hover:text-gray-300 transition-colors hover:animate-hoverFloatUp dark:animate-hoverFloatUpDark'
							>
								Fiyatlandırma
							</a>
							<a
								href='/bilgi'
								className='text-sm text-text hover:text-gray-300 transition-colors hover:animate-hoverFloatUp dark:animate-hoverFloatUpDark'
							>
								Kaynaklar
							</a>
							<a
								href='#'
								className='text-sm text-text hover:text-gray-300 transition-colors hover:animate-hoverFloatUp dark:animate-hoverFloatUpDark'
							>
								Hakkımızda
							</a>
						</nav>
					</div>

					<div className='flex justify-center'>
						<nav className='flex items-center gap-2 md:gap-2 '>
							<div className='hover:animate-hoverFloatUp'>
								<a href={mailUrl}>
									<EmailIcon className='icon w-10 h-10 lg:h-12 lg:w-12 shrink-0 self-end' />
								</a>
							</div>
							<a href={whatsappUrl} className='hover:animate-hoverFloatUp'>
								<WhatsappIcon className='w-10 h-10 lg:h-12 lg:w-12 shrink-0' />
							</a>
						</nav>
					</div>
				</div>
				<div className=' pt-5 text-center'>
					<p className='text-sm text-gray-500'>
						© 2026 Global Çöpçü. Tüm hakları saklıdır.
					</p>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
