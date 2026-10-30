"use server";

import { redirect } from "next/navigation";
import { consumeSignInLink, endMemberSession, safeNext, sendSignInLink } from "@/lib/members/auth";
import { allow, validEmail } from "@/lib/members/limits";

export async function requestSignIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(formData.get("next"));
  const back = (error: string) => redirect(`/sign-in?${new URLSearchParams({ next, error })}`);
  if (!validEmail(email)) back("email");
  if (!(await allow("sign-in", 3600, 5)) || !(await allow("sign-in-email", 3600, 3, email))) back("limit");
  await sendSignInLink(email, next);
  redirect(`/sign-in/check${process.env.NODE_ENV === "development" ? `?${new URLSearchParams({ dev: email })}` : ""}`);
}

export async function verifySignIn(formData: FormData) {
  const next = await consumeSignInLink(String(formData.get("token") ?? ""));
  redirect(next ?? "/sign-in?error=link");
}

export async function signOutMember() {
  await endMemberSession();
  redirect("/");
}
