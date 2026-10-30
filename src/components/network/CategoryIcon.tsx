import {
  Brush, CakeSlice, Camera, Car, ClipboardList, Croissant, Flower2, Gem, Gift, Landmark, Mail, Music, Scissors, Shirt,
  Store, Tent, UtensilsCrossed, Video, type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  wedding_planners: ClipboardList,
  wedding_venues: Landmark,
  bridal_shops: Shirt,
  jewelers: Gem,
  stationers: Mail,
  photographers: Camera,
  videographers: Video,
  florists: Flower2,
  flower_gift_shops: Gift,
  caterers: UtensilsCrossed,
  djs_music: Music,
  event_rentals: Tent,
  cake_makers: CakeSlice,
  bakeries: Croissant,
  limos: Car,
  hair_makeup: Brush,
  salons: Scissors,
};

export function CategoryIcon({ id, className = "h-6 w-6" }: { id: string; className?: string }) {
  const Icon = icons[id] ?? Store;
  return <Icon aria-hidden="true" className={className} />;
}
