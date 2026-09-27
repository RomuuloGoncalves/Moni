"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
} from "@/app/(dashboard)/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Car,
  Bus,
  Train,
  Plane,
  Fuel,
  Home,
  Building2,
  Wrench,
  Lightbulb,
  Droplet,
  Wifi,
  Phone,
  Tv,
  Music,
  Film,
  Gamepad2,
  Dumbbell,
  HeartPulse,
  Pill,
  Stethoscope,
  Baby,
  Dog,
  Cat,
  Shirt,
  Scissors,
  GraduationCap,
  Briefcase,
  Gift,
  PiggyBank,
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  Palmtree,
  Umbrella,
  Church,
  Landmark,
  Receipt,
  Shield,
  Book,
  Heart,
  Tag,
  Trash2,
  Plus,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  car: Car,
  bus: Bus,
  train: Train,
  plane: Plane,
  fuel: Fuel,
  home: Home,
  building: Building2,
  wrench: Wrench,
  lightbulb: Lightbulb,
  droplet: Droplet,
  wifi: Wifi,
  phone: Phone,
  tv: Tv,
  music: Music,
  film: Film,
  gamepad: Gamepad2,
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  pill: Pill,
  stethoscope: Stethoscope,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  shirt: Shirt,
  scissors: Scissors,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  "credit-card": CreditCard,
  banknote: Banknote,
  "trending-up": TrendingUp,
  palmtree: Palmtree,
  umbrella: Umbrella,
  church: Church,
  landmark: Landmark,
  receipt: Receipt,
  shield: Shield,
  book: Book,
  heart: Heart,
  tag: Tag,
};

const ICONS = Object.keys(ICON_MAP);

const COLOR_SWATCHES = [
  "#0e5c4f",
  "#1f9d6b",
  "#5bb89a",
  "#e0a82e",
  "#d9483b",
  "#e07a9b",
  "#7c5cc4",
  "#3b6fd9",
  "#64748b",
];

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

function IconPickerDialog({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (icon: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Escolher ícone"
          >
            <CategoryIcon iconType={value} className="h-4 w-4" />
          </button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha um ícone</DialogTitle>
          <DialogDescription>{ICONS.length} ícones disponíveis.</DialogDescription>
        </DialogHeader>
        <div
          className="grid grid-cols-6 gap-2 sm:grid-cols-7"
          role="radiogroup"
          aria-label="Ícone da categoria"
        >
          {ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={value === icon}
              aria-label={icon}
              onClick={() => {
                onSelect(icon);
                setPickerOpen(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                value === icon
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-accent"
              }`}
            >
              <CategoryIcon iconType={icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Crie categorias para entender para onde vai seu dinheiro.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="default" className="shrink-0 gap-1.5">
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
              <div className="flex flex-col gap-2">
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
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  role="radiogroup"
                  aria-labelledby="category-color-label"
                >
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      role="radio"
                      aria-checked={color.toLowerCase() === swatch}
                      aria-label={swatch}
                      onClick={() => setColor(swatch)}
                      className="size-8 shrink-0 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-checked:ring-2 aria-checked:ring-foreground/70"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                  <label
                    className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-input text-xs text-muted-foreground hover:border-ring focus-within:outline-2 focus-within:outline-ring"
                    title="Outra cor"
                    style={
                      COLOR_SWATCHES.includes(color.toLowerCase())
                        ? undefined
                        : { backgroundColor: color, borderStyle: "solid" }
                    }
                  >
                    <span aria-hidden="true">
                      {COLOR_SWATCHES.includes(color.toLowerCase()) ? "+" : ""}
                    </span>
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
                <div className="flex items-center gap-3">
                  <IconPickerDialog value={iconType} onSelect={setIconType} />
                  <p className="text-sm text-muted-foreground">
                    Toque para escolher entre {ICONS.length} ícones
                  </p>
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

      <div className="flex flex-col gap-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          categories.map((category) => (
            <Card key={category._id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${category.color}22`, color: category.color }}
                  >
                    <CategoryIcon iconType={category.iconType} className="h-4 w-4" />
                  </span>
                  <p className="truncate text-base font-medium">{category.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(category._id, category.name)}
                  className="flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                  aria-label={`Excluir ${category.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default CategoryList;
