"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTransition } from "react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthSelector({ currentMonth, currentYear }: { currentMonth: number; currentYear: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateDate(month: number, year: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month.toString());
      params.set("year", year.toString());
      router.push(`?${params.toString()}`);
    });
  }

  function handlePrev() {
    let m = currentMonth - 1;
    let y = currentYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    updateDate(m, y);
  }

  function handleNext() {
    let m = currentMonth + 1;
    let y = currentYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    updateDate(m, y);
  }

  function handleMonthChange(value: string | null) {
    if (!value) return;
    updateDate(parseInt(value, 10), currentYear);
  }

  function handleYearChange(value: string | null) {
    if (!value) return;
    updateDate(currentMonth, parseInt(value, 10));
  }

  const currentYearStr = currentYear.toString();
  const currentMonthStr = currentMonth.toString();

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className={`flex items-center gap-2 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select value={currentMonthStr} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentYearStr} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[90px] h-9">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
