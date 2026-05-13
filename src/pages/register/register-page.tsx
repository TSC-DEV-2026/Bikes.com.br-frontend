import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import PessoaFisicaForm from "@/components/pessoaFisicaForm";
import PessoaJuridicaForm from "@/components/pessoaJuridicaForm";
import { userRoutes } from "@/api/endpoints";
import { getAxiosErrorMessage } from "@/lib/api-error";

type DeviceType = "mobile" | "tablet" | "laptop" | "desktop";
type PessoaTipo = "PF" | "PJ";

const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) setDeviceType("mobile");
      else if (width >= 768 && width < 1024) setDeviceType("tablet");
      else if (width >= 1024 && width < 1440) setDeviceType("laptop");
      else setDeviceType("desktop");
    };

    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    return () => window.removeEventListener("resize", checkDeviceType);
  }, []);

  return deviceType;
};

export default function RegisterPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const deviceType = useDeviceType();

  const [pessoaTipo, setPessoaTipo] = useState<PessoaTipo>("PF");

  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    telefone_celular: "",
    data_nascimento: "",
    cpf_cnpj: "",
    fantasia: "",
    regime: "",
    senha: "",
  });

  const [errors, setErrors] = useState({
    nome_completo: "",
    email: "",
    telefone_celular: "",
    regime: "",
  });

  // PJ helpers
  const [showRegimeOptions, setShowRegimeOptions] = useState(false);

  const regimes = useMemo(
    () => ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"],
    []
  );

  const filteredRegimes = useMemo(() => {
    const q = (formData.regime || "").toLowerCase();
    if (!q) return regimes;
    return regimes.filter((r) => r.toLowerCase().includes(q));
  }, [formData.regime, regimes]);

  const selecionarRegime = useCallback((regime: string) => {
    setFormData((prev) => ({ ...prev, regime }));
    setShowRegimeOptions(false);
    setErrors((prev) => ({ ...prev, regime: "" }));
  }, []);

  // =========================
  // VALIDADORES
  // =========================

  const validarNome = (nome: string) => {
    if (nome.trim() === "")
      return pessoaTipo === "PJ"
        ? "O nome da empresa é obrigatório"
        : "O nome é obrigatório";
    if (pessoaTipo === "PF" && /\d/.test(nome))
      return "O nome não pode conter números";
    return "";
  };

  const validarEmail = (email: string) => {
    if (email.trim() === "") return "O e-mail é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Por favor, insira um e-mail válido";
    return "";
  };

  const validarTelefone = (telefone: string) => {
    const numbers = telefone.replace(/\D/g, "");
    if (numbers.length !== 11) return "Telefone inválido (deve ter 11 dígitos)";
    if (/[a-zA-Z]/.test(telefone)) return "O telefone não pode conter letras";
    return "";
  };

  const validarCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (pessoaTipo === "PF") {
      if (numbers.length !== 11) return "CPF inválido (deve ter 11 dígitos)";
      return "";
    }
    if (numbers.length !== 14) return "CNPJ inválido (deve ter 14 dígitos)";
    return "";
  };

  const validarRegime = (_regime: string) => {
    // Campos de PJ extras não são enviados ao backend atual — não bloqueiam envio.
    return "";
  };

  const totalPages = 2;

  const validateCurrentPage = useMemo(() => {
    if (currentPage !== 1) return true;

    const nomeValido = validarNome(formData.nome_completo) === "";
    const emailValido = validarEmail(formData.email) === "";
    const telefoneValido = validarTelefone(formData.telefone_celular) === "";
    const cpfCnpjValido = validarCpfCnpj(formData.cpf_cnpj) === "";
    const senhaValida = formData.senha.trim() !== "";

    return nomeValido && emailValido && telefoneValido && cpfCnpjValido && senhaValida;
  }, [currentPage, formData, pessoaTipo]);

  // =========================
  // FORMATADORES
  // =========================

  const cleanNumber = useCallback(
    (value: string): string => value.replace(/\D/g, ""),
    []
  );

  const formatCPF = useCallback((value: string): string => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }, []);

  const formatCNPJ = useCallback((value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 14);
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }, []);

  const formatPhone = useCallback((value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 11)
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    return value;
  }, []);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!termsAccepted) {
        toast.error("Você precisa aceitar os termos de uso");
        return;
      }

      const novosErros = {
        nome_completo: validarNome(formData.nome_completo),
        email: validarEmail(formData.email),
        telefone_celular: validarTelefone(formData.telefone_celular),
        regime: validarRegime(formData.regime),
      };

      setErrors(novosErros);

      const temErros = Object.values(novosErros).some((error) => error !== "");
      if (temErros) {
        toast.error("Corrija os erros antes de enviar");
        return;
      }

      // validação extra (CPF/CNPJ)
      const cpfCnpjMsg = validarCpfCnpj(formData.cpf_cnpj);
      if (cpfCnpjMsg) {
        toast.error("Corrija os erros antes de enviar", {
          description: cpfCnpjMsg,
        });
        return;
      }

      setIsLoading(true);

      try {
        const tel = cleanNumber(formData.telefone_celular);
        const payload: userRoutes.RegisterPayload = {
          email: formData.email,
          senha: formData.senha,
          pessoa: {
            nome_completo: formData.nome_completo.trim(),
            cpf: cleanNumber(formData.cpf_cnpj),
            telefone: tel || undefined,
          },
        };

        const response = await userRoutes.register(payload);

        if (response.status === 201 || response.status === 200) {
          toast.success("Cadastro realizado com sucesso!", {
            duration: 2500, // 2.5s visível
          });

          // Opcional: impede cliques repetidos enquanto aguarda
          setIsLoading(true);

          await sleep(2500);
          navigate("/login", { replace: true });
          setCurrentPage(1);
          setTermsAccepted(false);
          setShowPassword(false);

          setFormData({
            nome_completo: "",
            email: "",
            telefone_celular: "",
            data_nascimento: "",
            cpf_cnpj: "",
            fantasia: "",
            regime: "",
            senha: "",
          });
        }
      } catch (error: unknown) {
        toast.error("Erro ao cadastrar", {
          description: getAxiosErrorMessage(error, "Ocorreu um erro ao tentar se cadastrar."),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [termsAccepted, formData, pessoaTipo, cleanNumber, navigate]
  );

  // =========================
  // CHANGE / BLUR
  // =========================

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      let formattedValue = value;

      if (name === "cpf_cnpj") {
        formattedValue =
          pessoaTipo === "PF" ? formatCPF(value) : formatCNPJ(value);
      } else if (name === "telefone_celular") {
        formattedValue = formatPhone(value);
      }

      setFormData((prev) => ({ ...prev, [name]: formattedValue }));

      if (errors[name as keyof typeof errors]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [formatCPF, formatCNPJ, formatPhone, errors, pessoaTipo]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      let error = "";
      switch (name) {
        case "nome_completo":
          error = validarNome(value);
          break;
        case "email":
          error = validarEmail(value);
          break;
        case "telefone_celular":
          error = validarTelefone(value);
          break;
        case "regime":
          error = validarRegime(value);
          break;
        default:
          break;
      }

      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [pessoaTipo]
  );

  // =========================
  // NAVEGAÇÃO PÁGINAS
  // =========================

  const nextPage = useCallback(() => {
    if (!validateCurrentPage) {
      toast.error("Preencha todos os campos obrigatórios corretamente");
      return;
    }
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [validateCurrentPage]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  // ao trocar PF/PJ: volta página 1 e limpa erros/termos para evitar estado inválido
  const onSelectPessoaTipo = useCallback((tipo: PessoaTipo) => {
    setPessoaTipo(tipo);
    setCurrentPage(1);
    setTermsAccepted(false);
    setErrors({
      nome_completo: "",
      email: "",
      telefone_celular: "",
      regime: "",
    });
    setFormData((prev) => ({
      ...prev,
      cpf_cnpj: "",
      fantasia: "",
      regime: "",
    }));
  }, []);

  const shouldShowSplitLayout = useMemo(
    () => deviceType === "laptop" || deviceType === "desktop",
    [deviceType]
  );

  const animationDuration = useMemo(() => {
    switch (deviceType) {
      case "mobile":
        return 0;
      case "tablet":
        return 0.3;
      default:
        return 0.7;
    }
  }, [deviceType]);

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip overscroll-y-none bg-white lg:min-h-svh">
      {(deviceType === "mobile" || deviceType === "tablet") && (
        <div className="fixed inset-0 -z-10 min-h-dvh">
          <img
            src="/img/fundo-cadastro.jpg"
            alt=""
            className="pointer-events-none absolute left-1/2 top-1/2 block h-[103%] w-[103%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#09bc8a]/50" aria-hidden />
        </div>
      )}

      <div
        className={`grid min-h-dvh w-full auto-rows-fr grid-cols-1 ${
          shouldShowSplitLayout ? "lg:min-h-svh lg:grid-cols-[1fr_1.2fr]" : ""
        }`}
      >
        {shouldShowSplitLayout && (
          <div className="relative order-first isolate hidden min-h-dvh overflow-hidden bg-[#0c1b33] lg:block lg:min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{
                  x: pathname === "/login" ? "-100%" : "100%",
                  opacity: 0,
                }}
                animate={{ x: 0, opacity: 1 }}
                exit={{
                  x: pathname === "/login" ? "100%" : "-100%",
                  opacity: 0,
                }}
                transition={{ duration: animationDuration, ease: "easeInOut" }}
                className="absolute inset-0 overflow-hidden"
              >
                <img
                  src="/img/fundo-cadastro.jpg"
                  alt=""
                  className="pointer-events-none absolute left-1/2 top-1/2 block h-[103%] w-[103%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#09bc8a]/50" aria-hidden />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div
          className={`order-last mx-auto flex min-h-dvh w-full max-w-[95vw] flex-col gap-6 bg-white p-4 lg:min-h-0 lg:bg-white ${
            shouldShowSplitLayout ? "lg:max-w-2xl lg:p-8" : ""
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{
                x:
                  deviceType === "mobile"
                    ? 0
                    : pathname === "/login"
                    ? "100%"
                    : "-100%",
                opacity: deviceType === "mobile" ? 1 : 0,
              }}
              animate={{ x: 0, opacity: 1 }}
              exit={{
                x:
                  deviceType === "mobile"
                    ? 0
                    : pathname === "/login"
                    ? "-100%"
                    : "100%",
                opacity: deviceType === "mobile" ? 1 : 0,
              }}
              transition={{ duration: animationDuration, ease: "easeInOut" }}
              className="flex flex-1 items-center justify-center p-2 w-full"
            >
              <div
                className={`w-full ${
                  deviceType === "mobile"
                    ? "max-w-[95vw]"
                    : deviceType === "tablet"
                    ? "max-w-[90vw]"
                    : deviceType === "laptop"
                    ? "max-w-[85vw]"
                    : "max-w-[800px]"
                } relative rounded-lg mx-auto`}
              >
                <div
                  className={`relative bg-white rounded-lg ${
                    deviceType === "mobile" ? "p-4" : "p-6"
                  } z-10 border border-gray-200 w-full`}
                >
                  <h2
                    className={`${
                      deviceType === "mobile" ? "text-xl" : "text-2xl"
                    } font-bold text-center mb-4`}
                  >
                    Criar Conta
                  </h2>

                  {/* Seletor PF/PJ */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">
                      Tipo de cadastro
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectPessoaTipo("PF")}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                          pessoaTipo === "PF"
                            ? "bg-[#09bc8a] text-white border-[#09bc8a]"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Pessoa Física
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectPessoaTipo("PJ")}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                          pessoaTipo === "PJ"
                            ? "bg-[#09bc8a] text-white border-[#09bc8a]"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Pessoa Jurídica
                      </button>
                    </div>
                  </div>

                  {pessoaTipo === "PF" ? (
                    <PessoaFisicaForm
                      formData={formData}
                      errors={{
                        nome_completo: errors.nome_completo,
                        email: errors.email,
                        telefone_celular: errors.telefone_celular,
                      }}
                      deviceType={deviceType}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      showPassword={showPassword}
                      isLoading={isLoading}
                      termsAccepted={termsAccepted}
                      validateCurrentPage={validateCurrentPage}
                      handleChange={handleChange}
                      handleBlur={handleBlur}
                      setShowPassword={setShowPassword}
                      setTermsAccepted={setTermsAccepted}
                      nextPage={nextPage}
                      prevPage={prevPage}
                      handleSubmit={handleSubmit}
                    />
                  ) : (
                    <PessoaJuridicaForm
                      formData={formData}
                      errors={errors}
                      deviceType={deviceType}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      showPassword={showPassword}
                      isLoading={isLoading}
                      termsAccepted={termsAccepted}
                      validateCurrentPage={validateCurrentPage}
                      showRegimeOptions={showRegimeOptions}
                      filteredRegimes={filteredRegimes}
                      handleChange={handleChange}
                      handleBlur={handleBlur}
                      setShowPassword={setShowPassword}
                      setTermsAccepted={setTermsAccepted}
                      setShowRegimeOptions={setShowRegimeOptions}
                      selecionarRegime={selecionarRegime}
                      nextPage={nextPage}
                      prevPage={prevPage}
                      handleSubmit={handleSubmit}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
