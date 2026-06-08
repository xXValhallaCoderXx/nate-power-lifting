"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  // Trim both sides: env vars set via Vercel/CLI commonly pick up a trailing newline or
  // surrounding whitespace, which would otherwise fail the strict equality check below.
  const password = String(formData.get("password") ?? "").trim();
  const expected = process.env.APP_PASSWORD?.trim();

  if (!expected) {
    return { error: "APP_PASSWORD is not configured on the server." };
  }
  if (password !== expected) {
    return { error: "Incorrect password." };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
