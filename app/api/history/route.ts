import { getChatsByUserId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
	const supabase = await createClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return Response.json("Unauthorized!", { status: 401 });
	}

	// biome-ignore lint: Forbidden non-null assertion.
	const chats = await getChatsByUserId({ id: user.id! });
	return Response.json(chats);
}
