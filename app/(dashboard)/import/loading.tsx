import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </main>
  );
}
