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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Crie categorias para entender para onde vai seu dinheiro.
        </p>
      </div>
      <CategoryList
        initialCategories={categories.map((c) => ({ ...c, _id: String(c._id) }))}
      />
    </main>
  );
}
