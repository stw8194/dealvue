export type ServiceMenuCategory = { id: number; name: string; selection_mode: "single" | "multiple"; sort_order: number };
export type BookableService = {
  id: number; name: string; price: number; duration_minutes: number | null;
  exclusive_group?: string | null; menu_category_id?: number | null;
};
export function serviceMinutes(service: BookableService) {
  return Math.max(30, Math.ceil((service.duration_minutes ?? 30) / 30) * 30);
}
export function serviceExclusiveKeys(service: BookableService, services: BookableService[], categories: ServiceMenuCategory[] = []) {
  // Legacy rows may not yet have exclusive_group. Cuts must still be exclusive.
  const legacy = /커트|컷|hair[ -]?cut/i.test(service.name) ? "cut" : service.exclusive_group;
  // Every real category allows only one selection at a time; the catch-all "기타 시술"
  // bucket is not a real category, so leftover services there stay freely combinable.
  const group = groupBookingServices(services, categories).find((item) => item.services.some((candidate) => candidate.id === service.id));
  return [legacy ? `group:${legacy}` : null, group?.exclusive ? `category:${group.key}` : null].filter((key): key is string => Boolean(key));
}
export function selectBookingService(selected: number[], service: BookableService, services: BookableService[], categories: ServiceMenuCategory[] = []) {
  // Selecting an already-selected service always toggles it off, exclusive or not.
  if (selected.includes(service.id)) return selected.filter((id) => id !== service.id);
  const keys = serviceExclusiveKeys(service, services, categories);
  return [...selected.filter((id) => {
    const other = services.find((item) => item.id === id);
    return other && !serviceExclusiveKeys(other, services, categories).some((key) => keys.includes(key));
  }), service.id];
}
export function groupBookingServices(services: BookableService[], categories: ServiceMenuCategory[]) {
  const groups = [...categories].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((category) => ({ key: String(category.id), name: category.name, exclusive: true, services: services.filter((service) => service.menu_category_id === category.id) }));
  const unassigned = services.filter((service) => !categories.some((category) => category.id === service.menu_category_id));
  if (!categories.length) {
    const defaults = ["커트", "염색", "펌", "클리닉", "기타 시술"];
    const label = (service: BookableService) => /커트|컷|hair[ -]?cut/i.test(service.name) ? "커트" : /염색|컬러/.test(service.name) ? "염색" : /펌|매직/.test(service.name) ? "펌" : /클리닉|케어|트리트먼트/.test(service.name) ? "클리닉" : "기타 시술";
    return defaults.map((name) => ({ key: name, name, exclusive: name !== "기타 시술", services: unassigned.filter((service) => label(service) === name) })).filter((group) => group.services.length);
  }
  if (unassigned.length) groups.push({ key: "unassigned", name: "기타 시술", exclusive: false, services: unassigned });
  return groups.filter((group) => group.services.length);
}
export function bookingTotals(selected: BookableService[]) {
  return { minutes: selected.reduce((sum, service) => sum + serviceMinutes(service), 0), price: selected.reduce((sum, service) => sum + service.price, 0) };
}
