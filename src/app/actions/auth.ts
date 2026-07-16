"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  if (!user.isActive) {
    return { error: "This account has been deactivated. Contact an admin." };
  }

  await createSession({ userId: user.id });
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
