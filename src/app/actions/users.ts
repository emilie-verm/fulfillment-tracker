"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { hashPassword, verifyPassword } from "@/lib/password";

const ROLES = ["FULFILLMENT", "OUTREACH", "ADMIN", "VIEWER"] as const;

export type ActionResult = { error?: string; success?: string } | undefined;

const CreateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(ROLES),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Only an admin can add users." };
  }

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      passwordHash,
    },
  });

  revalidatePath("/users");
  return { success: `Created account for ${parsed.data.name}.` };
}

const ResetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetUserPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Only an admin can reset passwords." };
  }

  const parsed = ResetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash },
  });

  revalidatePath("/users");
  return { success: "Password updated." };
}

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
});

export async function updateUserRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentUser();
  if (admin.role !== "ADMIN") {
    return { error: "Only an admin can change roles." };
  }

  const parsed = UpdateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "Not found." };

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const otherActiveAdmins = await db.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: target.id } },
    });
    if (otherActiveAdmins === 0) {
      return { error: "Can't change this — they're the last active admin." };
    }
  }

  await db.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  revalidatePath("/users");
  return { success: `Updated ${target.name}'s role.` };
}

const SetActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.enum(["true", "false"]),
});

export async function setUserActive(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentUser();
  if (admin.role !== "ADMIN") {
    return { error: "Only an admin can deactivate or reactivate accounts." };
  }

  const parsed = SetActiveSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const active = parsed.data.active === "true";
  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "Not found." };

  if (!active) {
    if (target.id === admin.id) {
      return { error: "You can't deactivate your own account." };
    }
    if (target.role === "ADMIN") {
      const otherActiveAdmins = await db.user.count({
        where: { role: "ADMIN", isActive: true, id: { not: target.id } },
      });
      if (otherActiveAdmins === 0) {
        return { error: "Can't deactivate the last active admin." };
      }
    }
  }

  await db.user.update({ where: { id: target.id }, data: { isActive: active } });
  revalidatePath("/users");
  return { success: active ? `Reactivated ${target.name}.` : `Deactivated ${target.name}.` };
}

const ChangeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function changeOwnPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = ChangeOwnPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const fullUser = await db.user.findUnique({ where: { id: user.id } });
  if (!fullUser) return { error: "Not found." };

  const valid = await verifyPassword(parsed.data.currentPassword, fullUser.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Password updated." };
}
