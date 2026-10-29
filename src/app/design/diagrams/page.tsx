import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITIES, FLOWS, LAYERS } from "./diagram-data";
import { Swimlane } from "./swimlane";

export const metadata: Metadata = {
  title: "Діаграми — dev",
  robots: { index: false },
};

const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4">
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
    {children}
  </section>
);

/** Dev-only overview of the architecture, the data model and the main flows. Source: docs/diagrams.md. */
const DiagramsPage = () => {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Діаграми системи</h1>
          <p className="text-muted-foreground">Лише для розробки. Повний UML: docs/diagrams.md</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Архітектура" hint="Від користувача до зовнішніх сервісів, зверху вниз">
        <div className="flex flex-col gap-2">
          {LAYERS.map((layer, index) => (
            <div key={layer.title} className="flex flex-col gap-2">
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-semibold">{layer.title}</h3>
                  <span className="text-xs text-muted-foreground">{layer.hint}</span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {layer.items.map((item) => (
                    <li key={item.name} className="min-w-0 rounded-lg border bg-muted p-3">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
              {index < LAYERS.length - 1 && (
                <div aria-hidden className="text-center text-muted-foreground">
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Модель даних" hint="Таблиці Supabase і зв’язки між ними">
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ENTITIES.map((entity) => (
            <li key={entity.name} className="min-w-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-mono text-base">{entity.name}</CardTitle>
                  <CardDescription>{entity.note}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <ul className="flex flex-col gap-1 font-mono text-xs">
                    {entity.fields.map((field) => (
                      <li key={field} className="break-words">
                        {field}
                      </li>
                    ))}
                  </ul>
                  {entity.relations.length > 0 && (
                    <ul className="flex flex-col gap-1 border-t pt-3 text-xs text-primary">
                      {entity.relations.map((relation) => (
                        <li key={relation}>{relation}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Сценарії" hint="Діаграми послідовності: суцільна стрілка — виклик, пунктир — відповідь">
        <div className="flex flex-col gap-6">
          {FLOWS.map((flow) => (
            <Card key={flow.id}>
              <CardHeader>
                <CardTitle>{flow.title}</CardTitle>
                <CardDescription>{flow.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <Swimlane flow={flow} />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
};

export default DiagramsPage;
