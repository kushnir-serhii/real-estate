import type { Metadata } from "next";

import { SoldNotFound } from "@/features/property/sold-not-found";

// Next adds `noindex` to 404 responses itself.
export const metadata: Metadata = {
  title: "Об'єкт не знайдено",
};

const PropertyNotFound = () => <SoldNotFound />;

export default PropertyNotFound;
