// Localize browser errors before they reach query consumers.
export async function fetchResponse(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	try {
		return await fetch(input, init);
	} catch (cause) {
		if (cause instanceof Error && cause.name === 'AbortError') throw cause;
		throw new Error(
			'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
			{ cause },
		);
	}
}

export async function readJson<T>(response: Response): Promise<T> {
	try {
		return await response.json();
	} catch (cause) {
		if (cause instanceof Error && cause.name === 'AbortError') throw cause;
		throw new Error('Sunucudan gelen yanıt okunamadı. Lütfen tekrar deneyin.', {
			cause,
		});
	}
}
