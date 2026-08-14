import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function OnboardingCTA() {
  return (
    <EmptyState
      title="Configura tu negocio"
      description="Para gestionar productos necesitas completar el registro de tu frutería."
      icon="🏪"
      action={
        <Link href="/registro/negocio">
          <Button>Configurar mi frutería</Button>
        </Link>
      }
    />
  );
}
