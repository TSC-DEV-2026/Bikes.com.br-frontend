import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiMail, FiClock } from "react-icons/fi";

// NOVO: rotas centralizadas
import { authRoutes, paths } from "@/app/routes";

function extractAxiosErrorMessage(err: any): string {
  // Axios costuma ter err.response.data
  const data = err?.response?.data;

  if (!data) return err?.message || "Tente novamente mais tarde.";

  // FastAPI: { detail: "..." } ou { detail: [...] }
  if (typeof data?.detail === "string") return data.detail;
  if (data?.detail) {
    try {
      return JSON.stringify(data.detail);
    } catch {
      return "Erro ao processar resposta do servidor.";
    }
  }

  // Outras APIs: { message: "..." }
  if (typeof data?.message === "string") return data.message;

  // Se vier texto puro
  if (typeof data === "string") return data;

  // Fallback genérico
  try {
    return JSON.stringify(data);
  } catch {
    return "Tente novamente mais tarde.";
  }
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    if (!emailSent) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }

    navigate(paths.login());
  }, [emailSent, countdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authRoutes.requestPasswordReset({ email });

      toast.success("E-mail enviado com sucesso!");
      setEmailSent(true);
    } catch (error: any) {
      toast.error("Erro ao enviar e-mail", {
        description: extractAxiosErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!emailSent ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90 text-base h-11"
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Enviar link de redefinição"}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-6 p-4 border border-[#09bc8a]/30 rounded-lg bg-[#09bc8a]/10">
          <div className="flex justify-center">
            <FiMail className="text-[#09bc8a] text-4xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">Verifique seu e-mail</h3>
          <p className="text-gray-600">
            Enviamos um link de redefinição para{" "}
            <span className="font-medium">{email}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <FiClock />
            <span>Redirecionando em {countdown} segundos...</span>
          </div>
        </div>
      )}
    </div>
  );
}
