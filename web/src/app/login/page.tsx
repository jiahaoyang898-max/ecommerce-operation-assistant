import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { AuthLayout } from "@/components/auth-layout";
import { DemoLoginFill } from "@/components/demo-login-fill";
import { PasswordInput } from "@/components/password-input";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: "邮箱或密码不正确，或者账号已被停用。",
  expired: "登录状态已过期，请重新登录后继续操作。",
  server: "登录服务暂时不可用，请稍后重试。",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 渲染登录页；表单由服务端 route 转发后端，页面本身不接触 token。 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  // error=1 为历史重定向参数，统一归并到凭据错误提示。
  const rawError = firstValue(params.error);
  const errorMessage =
    rawError === "1" || rawError === undefined
      ? rawError
        ? LOGIN_ERRORS.invalid_credentials
        : null
      : LOGIN_ERRORS[rawError] ?? LOGIN_ERRORS.server;
  const signedOut = firstValue(params.signed_out) === "1";

  return (
    <AuthLayout>
      <form className="auth-form" action="/login/submit" method="post" autoComplete="on">
        <div className="auth-tag">SIGN IN</div>
        <h1 className="auth-title">登录运营工作台</h1>
        <p className="auth-lead">使用企业邮箱账号登录，继续管理你的店铺与投放任务。</p>

        <div className="auth-body">
          {signedOut ? (
            <div className="auth-notice auth-notice-ok">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>已安全退出登录，请重新登录以继续使用工作台。</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="auth-notice">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="loginEmail">企业邮箱</label>
            <div className="auth-control">
              <input
                id="loginEmail"
                name="email"
                type="email"
                placeholder="请输入企业邮箱"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-field-row">
              <label htmlFor="loginPassword">密码</label>
              <span className="auth-hint">
                <Link href="/register">没有账号？去注册</Link>
              </span>
            </div>
            <PasswordInput
              id="loginPassword"
              name="password"
              placeholder="请输入登录密码"
              autoComplete="current-password"
            />
          </div>

          <label className="auth-check">
            <input type="checkbox" name="remember" defaultChecked />
            <span>在此设备上保持登录状态</span>
          </label>

          <button type="submit" className="auth-btn auth-btn-primary">
            登 录
          </button>

          <DemoLoginFill />
          <p className="auth-hint">演示账号：demo@example.com / Passw0rd123</p>
        </div>

        <div className="auth-swap">
          <span>还没有账号？</span>
          <Link href="/register">创建新账号</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
