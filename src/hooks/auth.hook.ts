"use client";

import {
	deleteSignOut,
	getMe,
	getMeClient,
	getProviderLogin,
} from "@/apis/auth.api";
import { QUERY_KEY_ME } from "@/constants/auth.constants";
import { SignOutResponse } from "@/types/auth.type";
import { Session, User } from "@supabase/supabase-js";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function useMeQuery(): UseQueryResult<User, Error> {
	return useQuery<User, Error>({
		queryKey: [QUERY_KEY_ME],
		queryFn: () => getMe(),
	});
}

export function useMeClientQuery(): UseQueryResult<Session | null, Error> {
	return useQuery<Session | null, Error>({
		queryKey: [QUERY_KEY_ME],
		queryFn: async () => {
			const session = await getMeClient();
			return session;
		},
	});
}

export function useSignOutMutation(): UseMutationResult<
	SignOutResponse,
	Error,
	void
> {
	const router = useRouter();
	const queryClient = useQueryClient();
	return useMutation<SignOutResponse, Error, void>({
		mutationFn: deleteSignOut,
		onSuccess: () => {
			queryClient.setQueryData([QUERY_KEY_ME], null);
			router.refresh();
		},
	});
}

export function useProviderLoginQuery({
	provider,
	next,
}: {
	provider: string;
	next: string;
}) {
	return useQuery<
		{ message: string },
		Error,
		{ provider: string; next: string }
	>({
		queryKey: [QUERY_KEY_ME, provider, next],
		queryFn: () => getProviderLogin(provider, next),
		enabled: !!provider && !!next,
	});
}

export function useAuth() {
	const [error, setError] = useState<Error | null>(null);
	// const { data: me, isLoading: isMeLoading, error: meError } = useMeQuery();
	const {
		data: session,
		isLoading: isMeLoading,
		error: meError,
	} = useMeClientQuery();
	const {
		mutate: signOutMutation,
		isPending: isSignOutPending,
		error: signOutError,
	} = useSignOutMutation();

	const signOut = useCallback(() => {
		signOutMutation();
	}, [signOutMutation]);

	useEffect(() => {
		if (meError || signOutError) {
			setError(meError || signOutError);
		}
	}, [meError, signOutError]);

	// 임시 콘솔 로그
	useEffect(() => {
		console.log("user =====>", session?.user);
	}, [session]);

	return {
		me: session?.user,
		signOut,
		isMeLoading,
		isSignOutPending,
		error,
	};
}
