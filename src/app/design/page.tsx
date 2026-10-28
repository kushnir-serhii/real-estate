import type { Metadata } from "next";
import { Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BRAND } from "@/constants/brand";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: `Дизайн-система — ${BRAND.name}`,
  robots: { index: false },
};

const SWATCHES = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "primary (акцент)", className: "bg-primary" },
  { name: "primary-foreground", className: "bg-primary-foreground" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "control", className: "bg-control" },
  { name: "ring", className: "bg-ring" },
];

const RADII = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "2xl", className: "rounded-2xl" },
];

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

const DesignPage = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{BRAND.name}</h1>
        <p className="text-muted-foreground">Дизайн-система (заглушка)</p>
      </div>
      <ThemeToggle />
    </header>

    <Section title="Кольори">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SWATCHES.map(({ name, className }) => (
          <li key={name} className="flex min-w-0 flex-col gap-1.5">
            <div className={`h-14 rounded-lg border ${className}`} />
            <span className="truncate text-sm text-muted-foreground">
              {name}
            </span>
          </li>
        ))}
      </ul>
    </Section>

    <Section title="Радіуси">
      <ul className="flex flex-wrap gap-3">
        {RADII.map(({ name, className }) => (
          <li key={name} className="flex flex-col items-center gap-1.5">
            <div className={`size-14 border bg-muted ${className}`} />
            <span className="text-sm text-muted-foreground">{name}</span>
          </li>
        ))}
      </ul>
    </Section>

    <Section title="Типографіка">
      <div className="flex flex-col gap-2">
        <p className="text-4xl font-bold">Знайдіть свій дім</p>
        <p className="text-2xl font-semibold">Квартири в центрі Києва</p>
        <p className="text-lg font-medium">Підзаголовок розділу</p>
        <p className="text-base">
          Основний текст: ґанок, їдальня, єдність, Львів, Чернігів.
        </p>
        <p className="text-sm text-muted-foreground">
          Допоміжний текст: 3 кімнати, 78 м², 5 поверх із 9.
        </p>
      </div>
      <div className="flex flex-col gap-1 rounded-xl border p-4">
        <span className="text-sm text-muted-foreground">
          Ціна (tabular-nums)
        </span>
        <p className="text-3xl font-bold tabular-nums">85 000 $</p>
        <p className="text-2xl font-semibold tabular-nums">2 450 000 ₴</p>
        <p className="text-lg tabular-nums">1 111 111 € / 8 888 888 €</p>
      </div>
    </Section>

    <Section title="Кнопки">
      <div className="flex flex-wrap gap-3">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg">Великий 48</Button>
        <Button>Звичайний 44</Button>
        <Button size="sm">Малий 28</Button>
        <Button size="xs">XS 24</Button>
        <Button size="icon" aria-label="Пошук">
          <Search />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Для дотику (сайт, форми) використовуйте розміри 44 і 48. Малі розміри
        лише для щільних екранів адмінки.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled>Неактивна</Button>
        <Button variant="outline" disabled>
          Неактивна
        </Button>
        <Button variant="outline">Tab для фокусу</Button>
      </div>
    </Section>

    <Section title="Поля форми">
      <div className="flex max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="design-phone">Телефон</Label>
          <Input
            id="design-phone"
            type="tel"
            placeholder="+380 __ ___ __ __"
            autoComplete="tel"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="design-name">Ім’я (неактивне)</Label>
          <Input id="design-name" disabled defaultValue="Олена" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="design-email">Email з помилкою</Label>
          <Input
            id="design-email"
            type="email"
            aria-invalid
            aria-describedby="design-email-error"
            defaultValue="olena@"
          />
          <p
            id="design-email-error"
            role="alert"
            className="text-sm text-destructive"
          >
            Перевірте адресу пошти
          </p>
        </div>
      </div>
    </Section>

    <Section title="Картка">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>3-кімнатна квартира, Київ</CardTitle>
          <CardDescription>78 м², 5 поверх із 9</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">85 000 $</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Показати телефон</Button>
        </CardFooter>
      </Card>
    </Section>
  </main>
);

export default DesignPage;
