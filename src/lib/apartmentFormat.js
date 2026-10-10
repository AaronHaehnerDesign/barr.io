export function eur(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
export function priceLabel(listingType, price) {
  return listingType === "rent" ? `${eur(price)}/mo` : eur(price);
}