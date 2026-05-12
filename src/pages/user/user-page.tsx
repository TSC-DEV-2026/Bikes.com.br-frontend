import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IoEyeSharp, IoEyeOffSharp } from "react-icons/io5";
import { FaRegEdit, FaTrash } from "react-icons/fa";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeSugestoesField } from "@/components/cidade-sugestoes-field";

// NOVO: rotas centralizadas
import { userRoutes, paths } from "@/api/endpoints";
import { messageFromApiErrorBody } from "@/lib/api-error";

interface Endereco {
  cidade: string;
  estado: string;
  pais: string;
  nome_destinatario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  referencia: string;
  bairro: string;
  endereco_primario: boolean;
}

interface SavedEndereco {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  nome_cidade: string;
  nome_estado: string;
  nome_destinatario?: string;
  endereco_primario: boolean;
}

function mapEnderecoFromApi(raw: Record<string, unknown>): SavedEndereco {
  return {
    id: Number(raw.id),
    cep: String(raw.cep ?? ""),
    logradouro: String(raw.logradouro ?? ""),
    numero: String(raw.numero ?? ""),
    complemento: raw.complemento != null ? String(raw.complemento) : undefined,
    bairro: String(raw.bairro ?? ""),
    nome_cidade: String(raw.cidade ?? raw.nome_cidade ?? ""),
    nome_estado: String(raw.estado ?? raw.nome_estado ?? ""),
    nome_destinatario:
      raw.nome_destinatario != null ? String(raw.nome_destinatario) : undefined,
    endereco_primario: Boolean(raw.principal ?? raw.endereco_primario),
  };
}

async function getBackendErrorMessage(response: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<string> {
  try {
    const data = await response.json();
    return messageFromApiErrorBody(data) ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
  });

  const [enderecos, setEnderecos] = useState<SavedEndereco[]>([]);
  const [currentEndereco, setCurrentEndereco] = useState<Endereco>({
    cidade: "",
    estado: "",
    pais: "",
    nome_destinatario: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    referencia: "",
    bairro: "",
    endereco_primario: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [showArrow, setShowArrow] = useState(false);

  const navigate = useNavigate();

  const scrollToLocations = useCallback(() => {
    const element = document.getElementById("saved-locations");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  }, []);

  const formatPhone = useCallback((value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  }, []);

  const formatCEP = useCallback((value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }, []);

  const handleNumericInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, field: keyof Endereco) => {
      const value = e.target.value.replace(/\D/g, "");
      setCurrentEndereco((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleCEPChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = formatCEP(e.target.value);
      setCurrentEndereco((prev) => ({ ...prev, cep: formattedValue }));
    },
    [formatCEP]
  );

  // perfil + endereços
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userResponse, enderecosResponse] = await Promise.all([
          userRoutes.me(),
          userRoutes.listEnderecos(),
        ]);

        if (!userResponse.ok) throw new Error(await getBackendErrorMessage(userResponse));
        if (!enderecosResponse.ok) throw new Error(await getBackendErrorMessage(enderecosResponse));

        const [userData, enderecosData] = await Promise.all([
          userResponse.json(),
          enderecosResponse.json(),
        ]);

        const ud = userData as Record<string, unknown>;
        const pessoa = ud?.pessoa as Record<string, unknown> | undefined;

        setFormData({
          nome: (typeof pessoa?.nome_completo === "string" ? pessoa.nome_completo : "") || "",
          email: typeof ud.email === "string" ? ud.email : "",
          telefone:
            typeof pessoa?.telefone === "string" && pessoa.telefone
              ? formatPhone(pessoa.telefone)
              : "",
          senha: "",
        });

        const rawList = Array.isArray(enderecosData)
          ? enderecosData
          : (((enderecosData as Record<string, unknown>)?.enderecos as unknown[]) ?? []);
        const list = rawList
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map(mapEnderecoFromApi);
        setEnderecos(list);
      } catch {
        toast.error("Erro ao carregar", {
          description: "Não foi possível carregar seus dados de perfil",
        });
        navigate(paths.login());
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [formatPhone, navigate]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const formatted = name === "telefone" ? formatPhone(value) : value;
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    },
    [formatPhone]
  );

  const handleEnderecoChange = useCallback(
    (key: keyof Endereco, value: string | boolean) => {
      setCurrentEndereco((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reloadEnderecos = useCallback(async () => {
    const res = await userRoutes.listEnderecos();
    if (!res.ok) throw new Error(await getBackendErrorMessage(res));
    const data = await res.json();
    const rawList = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.enderecos ?? []);
    const list = (Array.isArray(rawList) ? rawList : [])
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map(mapEnderecoFromApi);
    setEnderecos(list);
  }, []);

  const saveEndereco = useCallback(
    async (enderecoData: Endereco) => {
      try {
        setIsSavingLocation(true);

        const cidadeNome = enderecoData.cidade.trim();
        const estadoNome = enderecoData.estado.trim();
        const paisNome = enderecoData.pais.trim() || "Brasil";

        if (!cidadeNome || !estadoNome) {
          toast.error("Dados incompletos", {
            description: "Busque e selecione uma cidade na lista",
          });
          return null;
        }

        const destinatario =
          enderecoData.nome_destinatario?.trim() || formData.nome.trim() || "Destinatário";

        const payload: userRoutes.CreateEnderecoPayload = {
          nome_destinatario: destinatario,
          cep: enderecoData.cep.replace(/\D/g, ""),
          logradouro: enderecoData.logradouro,
          numero: enderecoData.numero,
          complemento: enderecoData.complemento || "",
          bairro: enderecoData.bairro,
          cidade: cidadeNome,
          estado: estadoNome,
          pais: paisNome,
          referencia: enderecoData.referencia || "",
          principal: enderecoData.endereco_primario,
        };

        const response = await userRoutes.createEndereco(payload);
        if (!response.ok) throw new Error(await getBackendErrorMessage(response));

        const result = await response.json();

        toast.success("Localização salva!", {
          description: "Seu endereço foi cadastrado com sucesso",
        });

        setShowArrow(!!enderecoData.complemento);

        await reloadEnderecos();
        return result;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Ocorreu um erro ao tentar salvar a localização";
        toast.error("Falha ao salvar", { description: msg });
        return null;
      } finally {
        setIsSavingLocation(false);
      }
    },
    [formData.nome, reloadEnderecos]
  );

  const addEndereco = useCallback(async () => {
    if (
      !currentEndereco.cidade.trim() ||
      !currentEndereco.estado.trim() ||
      !currentEndereco.pais.trim()
    ) {
      toast.error("Dados obrigatórios", {
        description: "Busque e selecione uma cidade na lista",
      });
      return;
    }

    const result = await saveEndereco(currentEndereco);

    if (result) {
      setCurrentEndereco({
        cidade: "",
        estado: "",
        pais: "",
        nome_destinatario: formData.nome || "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        referencia: "",
        bairro: "",
        endereco_primario: false,
      });
      setShowArrow(false);
    }
  }, [currentEndereco, saveEndereco, formData.nome]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        // PENDÊNCIA: backend real não informou endpoint de update de perfil.
        // Não inventar rota/contrato: bloqueia ação e informa.
        toast.error("Atualização de perfil indisponível", {
          description:
            "O backend real não possui endpoint para atualizar perfil (pendência).",
        });
      } catch (error: any) {
        console.log("Erro updateProfile:", error);
        toast.error("Falha na atualização", {
          description: error?.message || "Ocorreu um erro ao tentar atualizar seu perfil",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [formData]
  );

  const _setAsPrimaryAddress = useCallback(
    async (id: number) => {
      try {
        const response = await userRoutes.setEnderecoPrimary(id);
        if (!response.ok) throw new Error(await getBackendErrorMessage(response));
        await reloadEnderecos();
        toast.success("Endereço definido como principal");
      } catch {
        toast.error("Erro", {
          description: "Não foi possível definir este endereço como principal",
        });
      }
    },
    [reloadEnderecos]
  );

  const deleteAddress = useCallback(
    async (id: number) => {
      try {
        const response = await userRoutes.deleteEndereco(id);
        if (!response.ok) throw new Error(await getBackendErrorMessage(response));

        await reloadEnderecos();
        toast.success("Endereço deletado com sucesso!");
      } catch {
        toast.error("Erro", {
          description: "Não foi possível deletar este endereço",
        });
      }
    },
    [reloadEnderecos]
  );

  const confirmDelete = useCallback(
    (id: number) => {
      const primaryAddress = enderecos.find((e) => e.endereco_primario);

      if (primaryAddress && primaryAddress.id === id && enderecos.length > 1) {
        toast.error("Não é possível excluir o endereço principal", {
          description: "Defina outro endereço como principal antes de excluir este",
        });
        return;
      }

      toast.custom(
        (t) => (
          <div className="">
            <p className="font-medium text-gray-800">
              Tem certeza que deseja excluir este endereço?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  deleteAddress(id);
                  toast.dismiss(t);
                }}
                className="bg-[#09bc8a] hover:bg-[#07a77a] text-white px-3 py-1 rounded-md text-sm font-medium"
              >
                Confirmar
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ),
        { duration: 10000 }
      );
    },
    [deleteAddress, enderecos]
  );

  if (isFetching) {
    return (
      <main className="mt-[80px] min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-[#09bc8a] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <div className="font-sans">
      <Header />

      <main className="mt-[80px] min-h-screen px-4 py-10 bg-gray-100 ">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="-ml-2 mb-2">
            <BackButton />
          </div>
          <div className="flex flex-col items-center justify-center gap-4 mb-8 md:mb-10">
            <p className="text-lg md:text-xl font-semibold">{formData.nome}</p>
            <Button variant="outline" className="text-sm md:text-base cursor-pointer">
              Trocar foto
            </Button>
          </div>

          {!showLocationForm ? (
            <form onSubmit={handleSubmit} className="space-y-6 ">
              <div>
                <Label>Nome completo</Label>
                <Input
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label>Telefone</Label>
                <Input
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  maxLength={15}
                  required
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    name="senha"
                    type={showPassword ? "text" : "password"}
                    value={formData.senha}
                    onChange={handleChange}
                    className="pr-10 cursor-pointer"
                    placeholder="Deixe em branco para manter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  >
                    {showPassword ? <IoEyeOffSharp /> : <IoEyeSharp />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setCurrentEndereco((prev) => ({
                    ...prev,
                    nome_destinatario: prev.nome_destinatario || formData.nome || "",
                  }));
                  setShowLocationForm(true);
                }}
                className="w-full cursor-pointer"
              >
                Adicionar informação de localização
              </Button>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <CidadeSugestoesField
                cidade={currentEndereco.cidade}
                estado={currentEndereco.estado}
                pais={currentEndereco.pais}
                disabled={isSavingLocation}
                onLocationChange={(loc) => {
                  if (!loc) {
                    setCurrentEndereco((prev) => ({
                      ...prev,
                      cidade: "",
                      estado: "",
                      pais: "",
                    }));
                  } else {
                    setCurrentEndereco((prev) => ({
                      ...prev,
                      cidade: loc.cidade,
                      estado: loc.estado,
                      pais: loc.pais,
                    }));
                  }
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nome do destinatário</Label>
                  <Input
                    value={currentEndereco.nome_destinatario}
                    onChange={(e) => handleEnderecoChange("nome_destinatario", e.target.value)}
                    placeholder={formData.nome || "Quem recebe neste endereço"}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label>CEP</Label>
                  <Input
                    value={currentEndereco.cep}
                    onChange={handleCEPChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={currentEndereco.bairro}
                    onChange={(e) => handleEnderecoChange("bairro", e.target.value)}
                    placeholder="Bairro"
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label>Logradouro</Label>
                  <Input
                    value={currentEndereco.logradouro}
                    onChange={(e) => handleEnderecoChange("logradouro", e.target.value)}
                    placeholder="Logradouro"
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label>Número</Label>
                  <Input
                    value={currentEndereco.numero}
                    onChange={(e) => handleNumericInput(e, "numero")}
                    placeholder="Número"
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <Label>Referência</Label>
                  <Input
                    value={currentEndereco.referencia}
                    onChange={(e) => handleEnderecoChange("referencia", e.target.value)}
                    placeholder="Ponto de referência (opcional)"
                    className="cursor-pointer"
                  />
                </div>

                <div className="relative pb-10 sm:col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    value={currentEndereco.complemento}
                    onChange={(e) => handleEnderecoChange("complemento", e.target.value)}
                    placeholder="Complemento (opcional)"
                    className={`mt-1 cursor-pointer ${showArrow ? "mb-6" : ""}`}
                  />
                  {showArrow && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 sm:left-[100%] sm:translate-x-0">
                      <button onClick={scrollToLocations} className="animate-bounce cursor-pointer">
                        <span className="text-[#0f9972] text-sm">Ver lista</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pb-6 pl-3">
                  <Checkbox
                    id="endereco-primario"
                    checked={currentEndereco.endereco_primario}
                    onCheckedChange={(checked) =>
                      handleEnderecoChange("endereco_primario", checked as boolean)
                    }
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor="endereco-primario"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Definir como endereço principal
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <Button onClick={addEndereco} className="w-full cursor-pointer" disabled={isSavingLocation}>
                  {isSavingLocation ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin cursor-pointer" />
                  ) : (
                    "Adicionar localização"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentEndereco({
                      cidade: "",
                      estado: "",
                      pais: "",
                      nome_destinatario: formData.nome || "",
                      cep: "",
                      logradouro: "",
                      numero: "",
                      complemento: "",
                      referencia: "",
                      bairro: "",
                      endereco_primario: false,
                    });
                    setShowLocationForm(false);
                    setShowArrow(false);
                  }}
                  className="w-full cursor-pointer"
                >
                  Voltar
                </Button>
              </div>

              {enderecos.length > 0 && (
                <div id="saved-locations" className="pt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Endereços cadastrados</h3>

                  {enderecos.map((e, i) => (
                    <div
                      key={e.id}
                      className={`p-4 border rounded-md space-y-1 text-sm ${
                        e.endereco_primario
                          ? "border-[#09bc8a] bg-[#09bc8a]/10"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-semibold">
                          {i + 1} - {e.endereco_primario ? "Endereço principal" : "Endereço secundário"}
                        </p>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(paths.editAddress(e.id))}
                            className="cursor-pointer"
                          >
                            <FaRegEdit className="size-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete(e.id)}
                            className="cursor-pointer text-red-500 hover:text-red-700"
                          >
                            <FaTrash className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <p><strong>Estado:</strong> {e.nome_estado}</p>
                      <p><strong>Cidade:</strong> {e.nome_cidade}</p>
                      <p><strong>Logradouro:</strong> {e.logradouro}</p>
                      <p><strong>Número:</strong> {e.numero}</p>

                      {e.complemento && (
                        <p className="text-[#0f9972] font-medium">
                          <strong>Complemento:</strong> {e.complemento}
                        </p>
                      )}

                      <p><strong>Bairro:</strong> {e.bairro}</p>
                      <p><strong>CEP:</strong> {e.cep}</p>
                      {e.nome_destinatario ? (
                        <p>
                          <strong>Destinatário:</strong> {e.nome_destinatario}
                        </p>
                      ) : null}

                      {!e.endereco_primario && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => void _setAsPrimaryAddress(e.id)}
                        >
                          Definir como principal
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
