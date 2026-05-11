// Property type — matches Lovable Cloud `properties` table
export type Property = {
  id: string;
  name: string;
  description: string;
  price: number;
  listingType: "rent" | "sale";
  propertyType: "condo" | "house" | "townhouse" | "commercial";
  bedrooms: number;
  bathrooms: number;
  area: number; // sqm
  area_name: string;
  lat: number;
  lng: number;
  address: string;
  image: string;
  availability: "available" | "reserved" | "sold";
  nearby: { name: string; type: string; distanceKm: number }[];
  tags: string[];
};

export type DbPropertyRow = {
  id: string;
  name: string;
  description: string;
  property_type: Property["propertyType"];
  listing_type: Property["listingType"];
  price: number;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  area_name: string;
  lat: number;
  lng: number;
  address: string;
  image_url: string;
  availability_status: Property["availability"];
  tags: string[] | null;
  nearby: Property["nearby"] | null;
};

export function rowToProperty(r: DbPropertyRow): Property {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    price: Number(r.price),
    listingType: r.listing_type,
    propertyType: r.property_type,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    area: Number(r.area_sqm),
    area_name: r.area_name,
    lat: Number(r.lat),
    lng: Number(r.lng),
    address: r.address ?? "",
    image: r.image_url ?? "",
    availability: r.availability_status,
    nearby: r.nearby ?? [],
    tags: r.tags ?? [],
  };
}
