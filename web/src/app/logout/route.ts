import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, WORKSPACE_COOKIE_NAME } from "@/lib/session";

/** 处理退出登录请求：清除会话 Cookie，并带退出成功标记回到登录页。 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(WORKSPACE_COOKIE_NAME);
  redirect("/login?signed_out=1");
}
