// app/forgot-password/page.tsx
import { ForgotPasswordForm } from "@/components/forgotPasswordForm";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "@/components/back-button";

export default function ForgotPasswordPage() {
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip overscroll-y-none bg-white lg:min-h-svh">
      <div className="fixed inset-0 -z-10 min-h-dvh lg:hidden">
        <img
          src="/img/fundo-cadastro.jpg"
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 block h-[103%] w-[103%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#09bc8a]/50" aria-hidden />
      </div>

      <div className="grid min-h-dvh w-full auto-rows-fr grid-cols-1 lg:min-h-svh lg:grid-cols-2">
        <div className="mx-auto flex min-h-dvh max-w-sm flex-col gap-6 rounded-xl bg-white px-8 py-10 shadow-xl md:px-10 lg:mx-0 lg:max-w-none lg:min-h-0 lg:rounded-none lg:bg-white lg:px-10 lg:py-10 lg:shadow-none">
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
                  <BackButton fallbackTo="/login" />
                </div>
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
        <div className="relative isolate hidden min-h-dvh overflow-hidden bg-[#0c1b33] lg:block lg:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0 overflow-hidden"
            >
              <img
                src="/img/fundo-cadastro.jpg"
                alt=""
                className="pointer-events-none absolute left-1/2 top-1/2 block h-[103%] w-[103%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
              />
              <div className="absolute inset-0 bg-[#09bc8a]/50" aria-hidden />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}