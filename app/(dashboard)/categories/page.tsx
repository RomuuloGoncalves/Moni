import { listCategoriesAction } from "./actions";
import { CategoryList } from "@/components/categories/category-list";

export default async function CategoriesPage() {
  const result = await listCategoriesAction();
  const categories = (result.data ?? []) as {
    _id: string;
    name: string;
    color: string;
    iconType: string;
  }[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <CategoryList
        initialCategories={categories.map((c) => ({ ...c, _id: String(c._id) }))}
      />
    </main>
  );
}
