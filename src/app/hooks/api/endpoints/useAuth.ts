import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import useApiMutation from '../core/useApiMutation';
import { clearAccessToken } from '../core/tokenManager';
import { AUTH_ROUTES } from '../../../constants/routes.constant';
import { PAGE_PATHS } from '../../../constants/pagePaths.constant';
import type { LoginInput } from '../../../schemas/auth.schema';

export type AuthRequest = LoginInput;
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

// Local state is cleared even if the request fails - the server session then
// just expires on its own.
export function useLogout() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	return useApiMutation<void, void>({
		url: AUTH_ROUTES.LOGOUT,
		method: 'POST',
		mutationOptions: {
			onSettled: () => {
				clearAccessToken();
				queryClient.clear();
				navigate(PAGE_PATHS.LOGIN, { replace: true });
			},
		},
	});
}
