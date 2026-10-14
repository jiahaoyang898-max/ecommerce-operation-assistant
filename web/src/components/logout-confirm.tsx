"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

type LogoutConfirmProps = {
  displayName: string;
  email: string;
};

/** 工作台退出入口：先弹出确认弹窗，确认后再提交退出请求，避免误触丢登录态。 */
export function LogoutConfirm({ displayName, email }: LogoutConfirmProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <span className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">
        {displayName}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        退出登录
      </button>

      {open ? (
        <div className="auth-scrim" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-dialog-ico">
              <LogOut className="h-[18px] w-[18px] text-red-600" aria-hidden="true" />
            </div>

            <div className="auth-dialog-title" id="logout-dialog-title">
              确认退出登录？
            </div>
            <p className="auth-dialog-text">
              退出后当前设备的登录状态将被清除，需要重新输入邮箱与密码才能进入工作台。未提交的编辑内容请先保存。
            </p>

            <div className="auth-dialog-box">
              <span>CURRENT ACCOUNT</span>
              <b>{email}</b>
            </div>

            <form action="/logout" method="post" className="auth-dialog-acts">
              <button type="button" className="auth-btn auth-btn-ghost" onClick={() => setOpen(false)}>
                取消
              </button>
              <button type="submit" className="auth-btn auth-btn-danger">
                退出登录
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
