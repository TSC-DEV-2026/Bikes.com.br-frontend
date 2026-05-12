import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeSugestoesField } from "@/components/cidade-sugestoes-field";

import { userRoutes, paths } from "@/api/endpoints";
import { messageFromApiErrorBody } from "@/lib/api-error";
import { notifyError, notifySuccess } from "@/lib/toast";

interface Endereco {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  referencia: string;
  bairro: string;
  nome_cidade: string;
  nome_estado: string;
  nome_pais: string;
  nome_destinatario: string;
  endereco_primario: boolean;
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

const formatarNome = (nome: string) => {
  if (!nome) return nome;

  const excecoes = ["de", "da", "do", "das", "dos", "e"];

  return nome
    .toLowerCase()
    .split(" ")
    .map((palavra, index) => {
      if (index !== 0 && excecoes.includes(palavra)) {
        return palavra;
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
};

export default function EditEnderecoPage() {
  const params = useParams();
  const idParam = (params as Record<string, string | undefined>).id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [endereco, setEndereco] = useState<Endereco>({
    id: 0,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    referencia: "",
    bairro: "",
    nome_cidade: "",
    nome_estado: "",
    nome_pais: "",
    nome_destinatario: "",
    endereco_primario: false,
  });

  const loadEndereco = useCallback(async () => {
    if (!id) {
      setError("ID do endereço não fornecido");
      setIsLoading(false);
      toast.error("Endereço inválido", {
        description: "O ID do endereço não foi especificado",
      });
      navigate(paths.user());
      return;
    }

    try {
      const response = await userRoutes.getEnderecoById(String(id));

      if (!response.ok) {
        throw new Error(await getBackendErrorMessage(response));
      }

      const raw = await response.json();
      const data = raw as Record<string, unknown>;

      if (data?.id == null) {
        throw new Error("Dados do endereço inválidos ou vazios");
      }

      const cidadeRaw = String(data.cidade ?? data.nome_cidade ?? "");

      const novoEndereco: Endereco = {
        id: Number(data.id),
        cep: String(data.cep ?? ""),
        logradouro: String(data.logradouro ?? ""),
        numero: String(data.numero ?? ""),
        complemento: String(data.complemento ?? ""),
        referencia: String(data.referencia ?? ""),
        bairro: String(data.bairro ?? ""),
        nome_cidade: formatarNome(cidadeRaw) || cidadeRaw.trim(),
        nome_estado: String(data.estado ?? data.nome_estado ?? "").trim(),
        nome_pais: String(data.pais ?? "Brasil").trim(),
        nome_destinatario: String(data.nome_destinatario ?? ""),
        endereco_primario: Boolean(data.principal ?? data.endereco_primario),
      };

      setEndereco(novoEndereco);

      setError(null);
    } catch (error: unknown) {
      console.error("[ERROR] Erro ao carregar endereço:", error);
      const msg = error instanceof Error ? error.message : "Erro ao carregar dados do endereço";
      setError(msg);
      toast.error("Falha ao carregar endereço", {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadEndereco();
  }, [loadEndereco]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEndereco((prev) => ({ ...prev, [name]: value } as Endereco));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setEndereco((prev) => ({ ...prev, endereco_primario: checked }));
  };

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    if (numbers.length <= 8) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCEP(e.target.value);
    setEndereco((prev) => ({ ...prev, cep: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (
        !endereco.nome_destinatario?.trim() ||
        !endereco.cep ||
        !endereco.logradouro ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.nome_cidade?.trim() ||
        !endereco.nome_estado?.trim() ||
        !endereco.nome_pais?.trim()
      ) {
        throw new Error("Preencha todos os campos obrigatórios, incluindo cidade (busca)");
      }

      const cepNumerico = endereco.cep.replace(/\D/g, "");
      if (cepNumerico.length !== 8) {
        throw new Error("CEP deve conter 8 dígitos");
      }

      const payload: userRoutes.UpdateEnderecoPayload = {
        id: endereco.id,
        nome_destinatario: endereco.nome_destinatario.trim(),
        cep: cepNumerico,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento || undefined,
        bairro: endereco.bairro,
        cidade: endereco.nome_cidade.trim(),
        estado: endereco.nome_estado.trim(),
        pais: endereco.nome_pais.trim(),
        referencia: endereco.referencia.trim() || undefined,
        principal: endereco.endereco_primario,
      };

      const response = await userRoutes.updateEndereco(payload);

      if (!response.ok) {
        throw new Error(await getBackendErrorMessage(response));
      }

      notifySuccess("Endereço atualizado com sucesso!");
      navigate(paths.user());
    } catch (error: unknown) {
      console.error("[ERROR] Erro ao atualizar endereço:", error);
      const msg = error instanceof Error ? error.message : "Tente novamente mais tarde";
      notifyError("Falha ao atualizar endereço", msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mt-[80px] min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-[#09bc8a] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mt-[80px] min-h-screen px-4 py-10 bg-gray-100">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600">Erro ao carregar endereço</h2>
          <p className="mb-4">{error}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar novamente
            </Button>
            <Button onClick={() => navigate(paths.user())}>Voltar</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="font-sans">
      <Header />

      <main className="mt-[80px] min-h-screen px-4 py-10 bg-gray-100">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <header className="mb-6">
            <div className="-ml-2">
              <BackButton fallbackTo={paths.user()} />
            </div>
            <h2 className="text-center text-xl font-bold">Editar Endereço</h2>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome do destinatário *</Label>
                <Input
                  name="nome_destinatario"
                  value={endereco.nome_destinatario}
                  onChange={handleChange}
                  placeholder="Quem recebe neste endereço"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <CidadeSugestoesField
                  cidade={endereco.nome_cidade}
                  estado={endereco.nome_estado}
                  pais={endereco.nome_pais}
                  disabled={isSaving}
                  onLocationChange={(loc) => {
                    if (!loc) {
                      setEndereco((prev) => ({
                        ...prev,
                        nome_cidade: "",
                        nome_estado: "",
                        nome_pais: "",
                      }));
                    } else {
                      setEndereco((prev) => ({
                        ...prev,
                        nome_cidade: loc.cidade,
                        nome_estado: loc.estado,
                        nome_pais: loc.pais,
                      }));
                    }
                  }}
                />
              </div>

              <div>
                <Label>CEP *</Label>
                <Input
                  name="cep"
                  value={endereco.cep}
                  onChange={handleCEPChange}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                />
              </div>

              <div>
                <Label>Bairro *</Label>
                <Input
                  name="bairro"
                  value={endereco.bairro}
                  onChange={handleChange}
                  placeholder="Bairro"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Logradouro *</Label>
                <Input
                  name="logradouro"
                  value={endereco.logradouro}
                  onChange={handleChange}
                  placeholder="Logradouro"
                  required
                />
              </div>

              <div>
                <Label>Número *</Label>
                <Input
                  name="numero"
                  value={endereco.numero}
                  onChange={handleChange}
                  placeholder="Número"
                  required
                />
              </div>

              <div>
                <Label>Complemento</Label>
                <Input
                  name="complemento"
                  value={endereco.complemento}
                  onChange={handleChange}
                  placeholder="Complemento (opcional)"
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Referência</Label>
                <Input
                  name="referencia"
                  value={endereco.referencia}
                  onChange={handleChange}
                  placeholder="Ponto de referência (opcional)"
                />
              </div>

              <div className="flex items-center space-x-2 sm:col-span-2">
                <Checkbox
                  id="endereco-primario"
                  checked={endereco.endereco_primario}
                  onCheckedChange={(v) => handleCheckboxChange(Boolean(v))}
                />
                <label
                  htmlFor="endereco-primario"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Endereço principal
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-[#09bc8a] hover:bg-[#07a77a] flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Salvar Alterações"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(paths.user())}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
