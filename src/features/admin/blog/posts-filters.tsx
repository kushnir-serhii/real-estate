import { Search } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BLOG_CATEGORIES } from "@/constants/blog";
import { FiltersAutoSubmit } from "@/features/admin/leads/filters-auto-submit";
import { SELECT_CLASS } from "@/features/catalog/catalog-labels";
import { cn } from "@/lib/utils";
import { ADMIN_BLOG_PATH } from "./post-form-values";
import { ADMIN_POST_SEARCH_MAX_LENGTH } from "./posts-params";
import type { PostsViewFilters } from "./posts-params";

type PostsFiltersProps = { filters: PostsViewFilters };

const FIELD_CLASS = "flex min-w-0 flex-col gap-2";

/** GET form, all state in the URL. Selects apply at once with JS; the search waits for Enter / «Показати». */
export const PostsFilters = ({ filters }: PostsFiltersProps) => (
  <Form
    action={ADMIN_BLOG_PATH}
    aria-label="Фільтри статей"
    className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:flex"
  >
    <div className={cn(FIELD_CLASS, "col-span-2 md:col-span-4 lg:flex-1")}>
      <Label htmlFor="posts-q">Заголовок або адреса</Label>
      <Input
        id="posts-q"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={ADMIN_POST_SEARCH_MAX_LENGTH}
        defaultValue={filters.q ?? ""}
      />
    </div>

    <div className={cn(FIELD_CLASS, "md:col-span-2 lg:w-44")}>
      <Label htmlFor="posts-status">Статус</Label>
      <select id="posts-status" name="status" defaultValue={filters.status} className={SELECT_CLASS}>
        <option value="all">Усі</option>
        <option value="published">Опубліковані</option>
        <option value="draft">Чернетки</option>
      </select>
    </div>

    <div className={cn(FIELD_CLASS, "md:col-span-2 lg:w-48")}>
      <Label htmlFor="posts-category">Категорія</Label>
      <select id="posts-category" name="category" defaultValue={filters.category} className={SELECT_CLASS}>
        <option value="all">Усі</option>
        {BLOG_CATEGORIES.map((category) => (
          <option key={category.key} value={category.key}>
            {category.label}
          </option>
        ))}
      </select>
    </div>

    <Button type="submit" className="col-span-2 md:col-span-4 lg:col-span-1">
      <Search aria-hidden="true" />
      Показати
    </Button>

    <FiltersAutoSubmit />
  </Form>
);
