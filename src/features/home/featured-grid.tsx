export const FeaturedGrid = ({ children }: { children: React.ReactNode }) => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">{children}</ul>
);
