import { Header } from "@/components/layout/header";
import { HideValuesProvider } from "@/lib/hooks/use-hide-values";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <HideValuesProvider>
      <Header />
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
    </HideValuesProvider>
  );
}
