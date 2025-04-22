import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { getMeServer } from "@/lib/auth-server.util";

async function ChatLayout({ children }: { children: React.ReactNode }) {
	const cookieStore = await cookies();
	const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

	const me = await getMeServer();

	return (
		<>
			{/* <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      /> */}
			<SidebarProvider defaultOpen={!isCollapsed}>
				<AppSidebar me={me} />
				<SidebarInset>{children}</SidebarInset>
			</SidebarProvider>
		</>
	);
}

export default ChatLayout;
