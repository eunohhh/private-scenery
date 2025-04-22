"use client";

import { FcGoogle } from "react-icons/fc";

function SignInTemplate() {
	const handleLoginWithProvider = () => {
		window.location.href = "/api/auth/provider?provider=google&next=/";
	};

	return (
		<div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
			<div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
				<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
					<h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
					<p className="text-sm text-gray-500 dark:text-zinc-400">
						구글로 로그인 하세요
					</p>
				</div>
				<div className="flex flex-col gap-4 px-4 sm:px-16">
					<button
						onClick={handleLoginWithProvider}
						className="w-full flex flex-row items-center justify-center h-[58px] bg-gray100 rounded-[20px] gap-3 font-medium cursor-pointer border-2 border-gray-200"
					>
						<FcGoogle className="w-5 h-5" /> 구글로 시작하기
					</button>
				</div>
			</div>
		</div>
	);
}

export default SignInTemplate;
