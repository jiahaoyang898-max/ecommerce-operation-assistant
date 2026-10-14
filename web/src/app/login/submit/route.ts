import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { AUTH_COOKIE_NAME } from "@/lib/session";

/** 处理登录提交：读取表单转发后端，成功后只把 token 写入 httpOnly cookie。 */
export async function POST(request: Request) {
  const formData = await request.formData();
  // 登录表单由服务端 route 转发给后端，成功后只把 token 写入 httpOnly cookie。
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: formData.get("email")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
    }),
  }).catch(() => null);

  if (!response) {
    redirect("/login?error=server");
  }

  if (!response.ok) {
    // 401/403 统一归为凭据或账号状态问题，页面只展示一条通用提示，避免泄露账号是否存在。
    redirect("/login?error=invalid_credentials");
  }

  const payload = (await response.json()) as { access_token: string };
  const cookieStore = await cookies();
  // httpOnly cookie 降低 token 被客户端脚本读取的风险；后续 API 调用由服务端统一附加 Authorization。
  cookieStore.set(AUTH_COOKIE_NAME, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}
