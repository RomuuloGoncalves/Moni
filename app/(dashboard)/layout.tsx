import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
    </>
  );
}
