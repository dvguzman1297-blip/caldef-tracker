"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/wordmark";

type Mode = "login" | "register" | "forgot" | "reset";
const email = z.string().email("Enter a valid email");
const password = z.string().min(8, "Use at least 8 characters");
const schemas = {
  login: z.object({ email, password: z.string().min(1, "Enter your password") }),
  register: z.object({ fullName: z.string().min(2, "Enter your name"), email, password }),
  forgot: z.object({ email }),
  reset: z.object({ password }),
};
const copy = {
  login: { title: "Welcome back", cta: "Log in" },
  register: { title: "Create your account", cta: "Create account" },
  forgot: { title: "Reset your password", cta: "Send reset link" },
  reset: { title: "Choose a new password", cta: "Save password" },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<any>({ resolver: zodResolver(schemas[mode] as any) });

  async function onSubmit(v: any) {
    const supabase = createClient();
    const origin = window.location.origin;
    const rawNext = new URLSearchParams(window.location.search).get("next") ?? "/";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
    setMsg(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) return setMsg({ ok: false, text: error.message });
      router.replace(next); router.refresh();
    } else if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: v.email, password: v.password,
        options: { data: { full_name: v.fullName }, emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) return setMsg({ ok: false, text: error.message });
      if (data.session) { router.replace("/profile"); router.refresh(); }
      else setMsg({ ok: true, text: "Check your email to confirm your account, then log in." });
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "If that email has an account, a reset link is on its way." });
    } else {
      const { error } = await supabase.auth.updateUser({ password: v.password });
      if (error) return setMsg({ ok: false, text: error.message });
      router.replace("/"); router.refresh();
    }
  }

  const field = (name: string, label: string, type = "text", auto?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} type={type} autoComplete={auto} className="input" {...register(name)} />
      {errors[name] && <p className="err">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass w-full max-w-sm space-y-4 p-6 shadow-xl">
      <Wordmark className="mx-auto h-16 w-auto text-fg" />
      <h1 className="text-xl font-bold">{copy[mode].title}</h1>
      {mode === "register" && field("fullName", "Full name", "text", "name")}
      {mode !== "reset" && field("email", "Email", "email", "email")}
      {mode !== "forgot" && field("password", mode === "reset" ? "New password" : "Password", "password",
        mode === "login" ? "current-password" : "new-password")}
      {msg && <p className={msg.ok ? "text-sm text-accent-fg" : "err"} role="status">{msg.text}</p>}
      <button className="btn w-full" disabled={isSubmitting}>{isSubmitting ? "Working…" : copy[mode].cta}</button>
      <div className="flex justify-between text-sm text-muted">
        {mode === "login" && <><Link href="/register">Create account</Link><Link href="/forgot-password">Forgot password?</Link></>}
        {(mode === "register" || mode === "forgot") && <Link href="/login">Back to log in</Link>}
      </div>
    </form>
  );
}
