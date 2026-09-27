"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
} from "@/app/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  Book,
  ShoppingBag,
  Tag,
  Plus,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  heart: Heart,
  gamepad: Gamepad2,
  book: Book,
  "shopping-bag": ShoppingBag,
  tag: Tag,
};

const ICONS = Object.keys(ICON_MAP);

const COLOR_SWATCHES = ["#0e5c4f", "#1f9d6b", "#5bb89a", "#e0a82e", "#d9483b", "#e07a9b", "#7c5cc4", "#3b6fd9", "#64748b"];

function CategoryIcon({ iconType, className }: { iconType: string; className?: string }) {
  const Icon = ICON_MAP[iconType] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}

interface CategoryItem {
  _id: string;
  name: string;
  color: string;
  iconType: string;
}

export function CategoryList({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [iconType, setIconType] = useState(ICONS[0]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createCategoryAction({ name, color, iconType });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCategories((prev) => [...prev, result.data as CategoryItem]);
      setName("");
      setOpen(false);
    });
  }

  function handleDelete(id: string, categoryName: string) {
    setError(undefined);
    if (!confirm(`Excluir a categoria "${categoryName}"?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCategories((prev) => prev.filter((c) => c._id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="default" className="gap-1.5">
                <Plus className="size-4" />
                Nova
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova categoria</DialogTitle>
              <DialogDescription>Organize suas transações por categoria.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label id="category-color-label">Cor</Label>
              <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-labelledby="category-color-label">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={color.toLowerCase() === swatch}
                    aria-label={swatch}
                    onClick={() => setColor(swatch)}
                    className="size-8 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-checked:ring-2 aria-checked:ring-foreground/70"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
                <label
                  className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-input text-xs text-muted-foreground hover:border-ring focus-within:outline-2 focus-within:outline-ring"
                  title="Outra cor"
                  style={COLOR_SWATCHES.includes(color.toLowerCase()) ? undefined : { backgroundColor: color, borderStyle: "solid" }}
                >
                  <span aria-hidden="true">{COLOR_SWATCHES.includes(color.toLowerCase()) ? "+" : ""}</span>
                  <input
                    id="category-color"
                    type="color"
                    aria-label="Outra cor"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ícone</Label>
              <div className="flex gap-1" role="radiogroup" aria-label="Ícone da categoria">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    role="radio"
                    aria-checked={iconType === icon}
                    aria-label={icon}
                    onClick={() => setIconType(icon)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                      iconType === icon
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <CategoryIcon iconType={icon} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Button type="submit" disabled={isPending}>
                Criar
              </Button>
            </div>
            </form>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          categories.map((category) => (
            <Badge
              key={category._id}
              variant="outline"
              className="flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-sm"
              style={{ borderColor: category.color }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${category.color}22`, color: category.color }}
              >
                <CategoryIcon iconType={category.iconType} className="h-3 w-3" />
              </span>
              {category.name}
              <button
                type="button"
                onClick={() => handleDelete(category._id, category.name)}
                className="ml-1 rounded px-1 text-muted-foreground hover:text-destructive"
                aria-label={`Excluir ${category.name}`}
              >
                ×
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

export default CategoryList;
