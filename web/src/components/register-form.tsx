"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type RegisterFormProps = {
  errorMessage: string | null;
};

const STRENGTH_LABELS = ["待输入", "弱", "中等", "较强"];

/** 按长度 + 字符类型组合粗略评估密码强度，得分 0~3 用于三段指示线。 */
function scorePassword(value: string): number {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
  return score;
}

/** 注册表单：客户端做密码强度与一致性校验，最终仍由服务端 route 再次校验。 */
export function RegisterForm({ errorMessage }: RegisterFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const score = scorePassword(password);
  const strengthText = password.length === 0 ? 0 : score;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (password !== confirmPassword) {
      event.preventDefault();
      setLocalError("两次输入的密码不一致，请重新确认。");
      return;
    }
    if (scorePassword(password) < 2) {
      event.preventDefault();
      setLocalError("密码强度不足：至少 8 位，且需同时包含字母与数字。");
      return;
    }
    setLocalError(null);
  }

  return (
    <form className="auth-form" action="/register/submit" method="post" onSubmit={handleSubmit}>
      <div className="auth-tag">CREATE ACCOUNT</div>
      <h1 className="auth-title">创建运营账号</h1>
      <p className="auth-lead">填写以下信息完成注册，创建后即可登录工作台。</p>

      <div className="auth-body">
        {errorMessage ? (
          <div className="auth-notice">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {localError ? (
          <div className="auth-notice">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{localError}</span>
          </div>
        ) : null}

        <div className="auth-field">
          <label htmlFor="registerName">昵称</label>
          <div className="auth-control">
            <input
              id="registerName"
              name="display_name"
              type="text"
              placeholder="用于工作台内显示的名称"
              autoComplete="nickname"
              maxLength={120}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="registerEmail">企业邮箱</label>
          <div className="auth-control">
            <input
              id="registerEmail"
              name="email"
              type="email"
              placeholder="请输入企业邮箱"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="registerPassword">设置密码</label>
          <div className="auth-control auth-control-pw">
            <input
              id="registerPassword"
              name="password"
              type={visible ? "text" : "password"}
              placeholder="至少 8 位，含字母与数字"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="auth-pw-toggle"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? "隐藏密码" : "显示密码"}
            >
              {visible ? "隐藏" : "显示"}
            </button>
          </div>
          <div className="auth-strength">
            <i className={strengthText > 0 ? "on" : undefined} />
            <i className={strengthText > 1 ? "on" : undefined} />
            <i className={strengthText > 2 ? "on" : undefined} />
          </div>
          <div className="auth-strength-label">密码强度：{STRENGTH_LABELS[strengthText]}</div>
        </div>

        <div className="auth-field">
          <label htmlFor="registerPasswordConfirm">确认密码</label>
          <div className="auth-control auth-control-pw">
            <input
              id="registerPasswordConfirm"
              name="confirm_password"
              type={visible ? "text" : "password"}
              placeholder="请再次输入密码"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
        </div>

        <label className="auth-check">
          <input type="checkbox" name="agree" value="1" required />
          <span>
            我已阅读并同意 <Link href="/register">服务条款</Link> 与 <Link href="/register">隐私政策</Link>
          </span>
        </label>

        <button type="submit" className="auth-btn auth-btn-primary">
          创建账号
        </button>
      </div>

      <div className="auth-swap">
        <span>已有账号？</span>
        <Link href="/login">返回登录</Link>
      </div>
    </form>
  );
}
