import { BookOpen, Gamepad2, House, Users, type LucideProps } from "lucide-react";
import type { PrimaryDestination } from "@/lib/navigation";

// Iconen voor de primaire bestemmingen, op één plek zodat een eigen
// Versado-iconenset ze later in één keer kan vervangen.
const ICONS: Record<PrimaryDestination, React.ComponentType<LucideProps>> = {
  today: House,
  learn: BookOpen,
  play: Gamepad2,
  friends: Users,
};

export default function NavIcon({ id, ...props }: { id: PrimaryDestination } & LucideProps) {
  const Icon = ICONS[id];
  return <Icon aria-hidden {...props} />;
}
