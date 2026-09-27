"use server";

import { redirect } from "next/navigation";
import { registerUser, DuplicateEmailError } from "@/services/user.service";

export interface RegisterActionState {
  error?: string;
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Preencha nome, email e senha" };
  }

  try {
    await registerUser({ name, email, password });
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return { error: "email já cadastrado" };
    }
    throw err;
  }

  redirect("/login");
}
