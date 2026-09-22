'use client';

import useApiMutation from '../core/useApiMutation';
import { AUTH_ROUTES } from '../../../constants/routes.constant';

// todo fix: tpyes are not correct

export type AuthRequest = {
	password: string;
	email: string;
};
export type UserRegistrationRequest = AuthRequest & {
	name: string;
	surname: string;
	username: string;
	avatarUrl: string;
};

export type userData = UserRegistrationRequest & {
	email: string;
	_id: string;
};

export type AuthResponse = {
	accessToken: string;
	user: userData;
};

export function useLogin() {
	return useApiMutation<AuthResponse, AuthRequest>({
		url: AUTH_ROUTES.LOGIN,
		method: 'POST',
	});
}
export function useLogout() {
	return useApiMutation({
		url: AUTH_ROUTES.LOGOUT,
		method: 'POST',
	});
}

export function useRefresh() {
	return useApiMutation<AuthResponse>({
		url: AUTH_ROUTES.REFRESH,
		method: 'POST',
	});
}
