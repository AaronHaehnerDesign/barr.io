import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { BedDouble, Bath, Maximize, MapPin, ArrowUpRight } from "lucide-react";
import { priceLabel } from "@/lib/apartmentFormat";

// One apartment listing card. Used on the Apartments page and on area detail
// pages. Images are placeholder photos served from media.base44.com, so they go
// through the Image component (resized/encoded per device).
export default function ApartmentCard({ a, distanceLabel, areaTo }) {
  return (
    <div className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image src={a.image_url} alt={a.title} fittingType="fill" className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{priceLabel(a.listing_type, a.price)}</span>
        <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize">{a.listing_type}</span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{a.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
          <MapPin className="h-3 w-3 shrink-0" />{a.district_name}{a.barri_name ? ` · ${a.barri_name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{a.rooms} bed</span>
          <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{a.bathrooms ?? 1} bath</span>
          <span className="inline-flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{a.size_sqm} m²</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {a.has_terrace && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Terrace</span>}
          {a.has_elevator && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">Elevator</span>}
          {a.floor && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.floor} floor</span>}
          {distanceLabel && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">📍 {distanceLabel}</span>}
        </div>
        {areaTo && (
          <Link to={areaTo} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View area<ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}