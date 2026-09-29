import { listGoalsAction } from "./actions";
import { GoalsList } from "@/components/goals/goals-list";

export default async function GoalsPage() {
  const result = await listGoalsAction();
  const goals = (result.data ?? []) as never[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas de Economia</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu progresso em direção aos seus objetivos financeiros.
        </p>
      </div>
      <GoalsList initialGoals={goals} />
    </main>
  );
}
