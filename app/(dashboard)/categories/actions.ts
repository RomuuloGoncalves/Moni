"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  categoryService,
  InvalidCategoryNameError,
  DuplicateCategoryError,
  CategoryHasTransactionsError,
  CategoryNotFoundError,
} from "@/services/category.service";
import { toPlainObject } from "@/lib/serialize";

interface ActionResult<T> {
  data?: T;
  error?: string;
}

class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new UnauthenticatedError();
  }
  return userId;
}

export async function listCategoriesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const categories = await categoryService.listCategories(userId);
    return { data: toPlainObject(categories) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function createCategoryAction(input: {
  name: string;
  color: string;
  iconType: string;
}): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const category = await categoryService.createCategory(userId, input);
    return { data: toPlainObject(category) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<void>> {
  try {
    const userId = await requireUserId();
    await categoryService.deleteCategory(userId, id);
    return {};
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof InvalidCategoryNameError) {
    return "nome da categoria inválido";
  }
  if (err instanceof DuplicateCategoryError) {
    return "categoria já existe";
  }
  if (err instanceof CategoryHasTransactionsError) {
    return "não é possível excluir uma categoria com transações vinculadas";
  }
  if (err instanceof CategoryNotFoundError) {
    return "categoria não encontrada";
  }
  throw err;
}
