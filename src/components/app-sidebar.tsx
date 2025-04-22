"use client";

import { useRouter } from "next/navigation";

import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { SidebarHistory } from "./sidebar-history";
import { SidebarUserNav } from "./sidebar-user-nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function AppSidebar({ me }: { me: User | null }) {
	const router = useRouter();
	const { setOpenMobile } = useSidebar();

	return (
		<Sidebar className="group-data-[side=left]:border-r-0">
			<SidebarHeader>
				<SidebarMenu>
					<div className="flex flex-row justify-between items-center">
						<Link
							href="/"
							onClick={() => {
								setOpenMobile(false);
							}}
							className="flex flex-row gap-3 items-center"
						>
							<span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
								Chatbot
							</span>
						</Link>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									type="button"
									className="p-2 h-fit"
									onClick={() => {
										setOpenMobile(false);
										router.push("/");
										router.refresh();
									}}
								>
									<PlusIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent align="end">New Chat</TooltipContent>
						</Tooltip>
					</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>{me && <SidebarHistory me={me} />}</SidebarContent>
			<SidebarFooter>{me && <SidebarUserNav me={me} />}</SidebarFooter>
		</Sidebar>
	);
}
