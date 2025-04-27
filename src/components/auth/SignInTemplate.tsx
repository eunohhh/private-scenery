"use client";

import { FcGoogle } from "react-icons/fc";

function SignInTemplate() {
	const handleLoginWithProvider = () => {
		window.location.href = "/api/auth/provider?provider=google&next=/";
	};

	return (
		<div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
			<div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
				<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
					<h3 className="font-semibold text-xl dark:text-zinc-50">Sign In</h3>
					<p className="text-gray-500 text-sm dark:text-zinc-400">
						구글로 로그인 하세요
					</p>
				</div>
				<div className="flex flex-col gap-4 px-4 sm:px-16">
					<button
						onClick={handleLoginWithProvider}
						className="flex h-[58px] w-full cursor-pointer flex-row items-center justify-center gap-3 rounded-[20px] border-2 border-gray-200 bg-gray100 font-medium"
					>
						<FcGoogle className="h-5 w-5" /> 구글로 시작하기
					</button>
				</div>
			</div>
		</div>
	);
}

export default SignInTemplate;
