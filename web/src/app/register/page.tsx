import { AuthLayout } from "@/components/auth-layout";
import { RegisterForm } from "@/components/register-form";

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const REGISTER_ERRORS: Record<string, string> = {
  email_exists: "该邮箱已被注册，请直接登录或更换邮箱。",
  password_mismatch: "两次输入的密码不一致，请重新确认。",
  password_weak: "密码需同时包含字母和数字，且不少于 8 位。",
  email_invalid: "邮箱格式不正确，请检查后重试。",
  display_name_required: "请填写昵称。",
  terms_required: "请先阅读并同意服务条款与隐私政策。",
  server: "注册服务暂时不可用，请稍后重试。",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 渲染注册页；表单由服务端 route 转发后端，页面本身不接触 token。 */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};
  const errorCode = firstValue(params.error);
  const errorMessage = errorCode ? REGISTER_ERRORS[errorCode] ?? REGISTER_ERRORS.server : null;

  return (
    <AuthLayout>
      <RegisterForm errorMessage={errorMessage} />
    </AuthLayout>
  );
}
