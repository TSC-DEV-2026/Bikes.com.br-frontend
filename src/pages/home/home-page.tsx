import { useAuth } from "@/contexts/auth-context";

import { PrivateHomePage } from "@/pages/home/private-home-page";
import { PublicHomePage } from "@/pages/home/public-home-page";

function HomeBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div
        className="size-10 animate-spin rounded-full border-4 border-[#09bc8a]/25 border-t-[#09bc8a]"
        aria-label="Carregando"
        role="status"
      />
    </div>
  );
}

/**
 * `/home` — visitante vê vitrine pública aprovada; usuário logado vê home privada original.
 */
export default function Home() {
  const { bootstrapped, isAuthenticated } = useAuth();

  if (!bootstrapped) {
    return <HomeBootScreen />;
  }

  if (!isAuthenticated) {
    return <PublicHomePage />;
  }

  return <PrivateHomePage />;
}
