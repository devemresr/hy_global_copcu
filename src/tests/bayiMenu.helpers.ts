import { act } from 'react';
export function openBayiMenu(label: string) {
	const trigger = document.querySelector<HTMLButtonElement>(
		'button[aria-haspopup="menu"][aria-label="' + label + '"]',
	);
	if (!trigger) throw new Error('Missing bayi menu: ' + label);
	if (trigger.getAttribute('aria-expanded') !== 'true')
		act(() => trigger.click());
	return trigger;
}
export function closeBayiMenu() {
	const menu = document.querySelector('[role="menu"]');
	if (menu)
		act(() =>
			menu.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
			),
		);
}
export function chooseBayiOption(label: string, name: string) {
	openBayiMenu(label);
	const option = [
		...document.querySelectorAll<HTMLButtonElement>(
			'[role="menuitemradio"],[role="menuitemcheckbox"]',
		),
	].find(
		(option) =>
			option.textContent === name ||
			option.textContent?.startsWith(name + ' ('),
	);
	if (!option) throw new Error('Missing bayi option: ' + name);
	act(() => option.click());
	closeBayiMenu();
}
