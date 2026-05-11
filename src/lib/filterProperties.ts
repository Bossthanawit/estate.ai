import type { Property } from "@/data/properties";

export type Filters = {
  area?: string;
  propertyType?: Property["propertyType"] | "Any";
  listingType?: Property["listingType"] | "Any";
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  nearTransit?: boolean;
  nearUniversity?: boolean;
  nearMall?: boolean;
  availability?: Property["availability"];
};

export function formatPrice(p: Pick<Property, "price" | "listingType">): string {
  if (p.listingType === "rent") return `฿${p.price.toLocaleString()}/mo`;
  return `฿${(p.price / 1_000_000).toFixed(2)}M`;
}

export const PROPERTY_TYPE_LABEL: Record<Property["propertyType"], string> = {
  condo: "Condo",
  house: "House",
  townhouse: "Townhouse",
  commercial: "Commercial",
};
