import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AlleskennerRoom from "@/components/alleskenner/AlleskennerRoom";

export default async function AlleskennerSoloGamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <AlleskennerRoom code={`SOLO-${id}`} soloRunId={id} />;
}
