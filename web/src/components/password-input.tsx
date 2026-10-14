"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
};

/** 密码输入框：内置明文 / 密文切换，密码状态不提升到页面组件。 */
export function PasswordInput({
  id,
  name,
  placeholder,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-control auth-control-pw">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
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
  );
}
