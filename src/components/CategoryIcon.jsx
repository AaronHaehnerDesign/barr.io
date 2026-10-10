import { Home, HeartPulse, GraduationCap, Footprints, Car, ShieldCheck, Construction, Wallet, ShoppingBag, Leaf, Baby, MessageSquareWarning, Luggage, Store, Eye, Truck } from "lucide-react";
import { CATEGORY_MAP } from "@/lib/categories";

const MAP = { Home, HeartPulse, GraduationCap, Footprints, Car, ShieldCheck, Construction, Wallet, ShoppingBag, Leaf, Baby, MessageSquareWarning, Luggage, Store, Eye, Truck };

export default function CategoryIcon({ categoryKey, className = "h-4 w-4" }) {
  const cat = CATEGORY_MAP[categoryKey];
  const Icon = (cat && MAP[cat.icon]) || Home;
  return <Icon className={className} />;
}