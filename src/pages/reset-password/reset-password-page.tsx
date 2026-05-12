import { useState, useEffect } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { IoEyeSharp, IoEyeOffSharp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

// NOVO: rotas centralizadas
import { authRoutes, paths } from "@/api/endpoints";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { BackButton } from "@/components/back-button";

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) toast.error("Token inválido ou expirado.");
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!token) {
      toast.error("Token inválido ou expirado.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      await authRoutes.resetPassword({
        token,
        nova_senha: formData.newPassword,
      });

      const ms = 1500;

      toast.success("Senha alterada com sucesso!", {
        description: "Redirecionando para o login...",
        duration: ms,
      });

      setTimeout(() => {
        navigate(paths.login());
      }, ms);
    } catch (error: unknown) {
      toast.error("Erro ao alterar a senha.", {
        description: getAxiosErrorMessage(
          error,
          "Não foi possível alterar a senha (verifique se o endpoint existe no backend)."
        ),
      });
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 -z-10 lg:hidden">
        <img
          src="/img/fundo-cadastro.jpg"
          alt="Imagem de fundo"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#09bc8a]/50"></div>
      </div>

      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="relative hidden lg:block overflow-hidden order-first">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img
                src="/img/fundo-cadastro.jpg"
                alt="Imagem de fundo"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[#09bc8a]/50"></div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-6 p-8 md:p-10 bg-white lg:bg-transparent rounded-xl lg:rounded-none shadow-xl lg:shadow-none mx-auto my-4 lg:my-0 w-full max-w-md lg:max-w-lg order-last">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="flex flex-1 items-center justify-center"
            >
              <div className="w-full max-w-sm">
                <div className="-ml-2 mb-4">
                  <BackButton fallbackTo={paths.login()} />
                </div>
                <div className="flex flex-col items-center gap-2 text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">
                    Redefinir Senha
                  </h1>
                  <p className="text-base text-gray-600">
                    Digite sua nova senha para continuar
                  </p>
                </div>

                {!token ? (
                  <p className="text-red-600 text-center">
                    Token inválido. Solicite novamente.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="newPassword" className="text-gray-700 text-base">
                          Nova Senha
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="bg-[#f9f9f9] border border-gray-300 focus:border-[#09bc8a] focus:ring-0 transition-all text-base h-11 pr-12"
                            placeholder="Digite sua nova senha"
                            required
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            disabled={isLoading}
                          >
                            {showNewPassword ? <IoEyeOffSharp size={20} /> : <IoEyeSharp size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword" className="text-gray-700 text-base">
                          Confirmar Senha
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="bg-[#f9f9f9] border border-gray-300 focus:border-[#09bc8a] focus:ring-0 transition-all text-base h-11 pr-12"
                            placeholder="Confirme sua nova senha"
                            required
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            disabled={isLoading}
                          >
                            {showConfirmPassword ? <IoEyeOffSharp size={20} /> : <IoEyeSharp size={20} />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90 text-base h-11 mt-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          "Redefinir Senha"
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="mt-4 text-center text-base">
                  <Link
                    to={paths.login()}
                    className="text-[#2b866c] hover:text-[#0c1b33] font-medium underline underline-offset-4"
                  >
                    Voltar para o login
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: `
              bg-white !important
              border border-gray-200
              flex items-center
              p-4 rounded-md
              shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)]
              gap-4
              max-w-[320px] w-full
              text-gray-800
            `,
            title: "font-bold text-sm",
            description: "text-sm",
            error: `
              !bg-red-100 !important
              !border-red-300
              !text-red-800
            `,
            success: `
              !bg-green-100 !important
              !border-green-300
              !text-green-800
            `,
            actionButton: `
              bg-[#09bc8a] hover:bg-[#07a77a]
              text-white
              px-3 py-1
              rounded-md
              text-sm font-medium
            `,
            cancelButton: `
              bg-gray-200 hover:bg-gray-300
              text-gray-800
              px-3 py-1
              rounded-md
              text-sm font-medium
              ml-2
            `,
          },
        }}
      />
    </>
  );
}
