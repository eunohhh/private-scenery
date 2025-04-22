import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	// console.log("callback 에서 받은 request =>", request);
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	// if "next" is in param, use it as the redirect URL
	const next = searchParams.get("next") ?? "/";

	if (code) {
		const cookieStore = await cookies();
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options),
							);
						} catch {}
					},
				},
			},
		);
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
			const isLocalEnv = process.env.NODE_ENV === "development";
			if (isLocalEnv) {
				if (next) return NextResponse.redirect(`${origin}${next}`);
				// we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
				return NextResponse.redirect(`${origin}`);
			} else if (forwardedHost) {
				if (next)
					return NextResponse.redirect(`https://${forwardedHost}${next}`);
				return NextResponse.redirect(`https://${forwardedHost}`);
			} else {
				return NextResponse.redirect(`${origin}${next}`);
			}
		}
	}
	// return the user to an error page with instructions
	return NextResponse.redirect(`${origin}`);
}
