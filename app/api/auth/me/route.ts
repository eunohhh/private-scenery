import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  console.log("data =====>", data);
  console.log("error =====>", error);

  if (error) {
    return NextResponse.json({ message: error?.message }, { status: 401 });
  }

  return NextResponse.json(data, { status: 200 });
}
