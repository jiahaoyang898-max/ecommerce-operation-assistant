"use client";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Passw0rd123";

export function DemoLoginFill() {
  return (
    <button
      type="button"
      className="auth-btn auth-btn-ghost"
      onClick={(event) => {
        const form = event.currentTarget.closest("form");
        if (!form) return;
        const email = form.elements.namedItem("email");
        const password = form.elements.namedItem("password");
        if (email instanceof HTMLInputElement) email.value = DEMO_EMAIL;
        if (password instanceof HTMLInputElement) password.value = DEMO_PASSWORD;
      }}
    >
      一键填入演示账号
    </button>
  );
}
