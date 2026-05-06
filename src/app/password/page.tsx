// app/forgot-password/page.tsx
import { ForgotPasswordForm } from "@/components/forgotPasswordForm";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const { pathname } = useLocation();

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
        <div className="flex flex-col gap-6 p-8 md:p-10 bg-white lg:bg-transparent rounded-xl lg:rounded-none shadow-xl lg:shadow-none mx-auto my-4 lg:my-0 max-w-sm lg:max-w-none">
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
                <div className="flex flex-col items-center gap-2 text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">Envio de redefinição senha</h1>
                  <p className="text-base text-gray-600">
                    Digite seu e-mail para receber o link de redefinição
                  </p>
                </div>
                <ForgotPasswordForm />
                <div className="mt-4 text-center text-base">
                  <Link 
                    to="/login" 
                    className="text-[#2b866c] hover:text-[#0c1b33] font-medium underline underline-offset-4"
                  >
                    Voltar para o login
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Coluna da Imagem (igual ao login) */}
        <div className="relative hidden lg:block overflow-hidden">
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
      </div>
    </>
  );
}