export const adminHeadingClass = (index = 0) =>
	`admin-collapse-heading flex w-full min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm font-medium text-text ${index % 2 ? 'bg-button-hover-bg/60' : 'bg-bg/60'}`;
