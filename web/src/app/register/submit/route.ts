import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { AUTH_COOKIE_NAME } from "@/lib/session";

/** 把后端 422 校验错误定位到前端可展示的错误码，避免直接暴露 pydantic 报文。 */
function mapUnprocessable(detail: unknown): string {
  if (!Array.isArray(detail)) {
    return "server";
  }
  const fields = detail.map((item) => {
    if (item && typeof item === "object" && Array.isArray((item as { loc?: unknown[] }).loc)) {
      return String((item as { loc: unknown[] }).loc.at(-1) ?? "");
    }
    return "";
  });
  if (fields.includes("password")) return "password_weak";
  if (fields.includes("email")) return "email_invalid";
  if (fields.includes("display_name")) return "display_name_required";
  return "server";
}

/** 处理注册提交：边界处二次校验 → 调用后端注册 → 写入 httpOnly cookie → 进入工作台。 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const displayName = formData.get("display_name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirm_password")?.toString() ?? "";
  const agreed = formData.get("agree")?.toString();

  // 客户端校验只用于提升体验，服务端仍按边界校验规则重新判定一次。
  if (!displayName) redirect("/register?error=display_name_required");
  if (password !== confirmPassword) redirect("/register?error=password_mismatch");
  if (agreed !== "1") redirect("/register?error=terms_required");

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName, email, password }),
  }).catch(() => null);

  if (!response) {
    redirect("/register?error=server");
  }

  if (!response.ok) {
    if (response.status === 409) {
      redirect("/register?error=email_exists");
    }
    if (response.status === 422) {
      const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      redirect(`/register?error=${mapUnprocessable(body?.detail)}`);
    }
    redirect("/register?error=server");
  }

  const payload = (await response.json()) as { access_token: string };
  const cookieStore = await cookies();
  // 与登录保持同一套会话策略：token 只存 httpOnly cookie，前端脚本读不到。
  cookieStore.set(AUTH_COOKIE_NAME, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}
