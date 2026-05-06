import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// NOVO: rotas centralizadas
import { userRoutes, paths } from "@/app/routes";

interface Endereco {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  nome_cidade: string;
  nome_estado: string;
  endereco_primario: boolean;
}

interface Estado {
  sigla: string;
  nome: string;
}

interface Cidade {
  nome: string;
}

async function getBackendErrorMessage(response: Response | any): Promise<string> {
  const backendMessage = `HTTP ${response.status}`;
  const contentType = response.headers?.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const data: any = await response.json();

      // FastAPI costuma mandar {detail: ...}
      if (typeof data?.detail === "string") return data.detail;
      if (data?.detail) return JSON.stringify(data.detail);

      // outros backends podem mandar {message: ...}
      if (typeof data?.message === "string") return data.message;

      return JSON.stringify(data);
    }

    const text = String(await response.text());
    if (text) return text;
  } catch {
    // mantém fallback
  }

  return backendMessage;
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

const cidadeCache = new Map<string, Cidade[]>();

export default function EditEnderecoPage() {
  const params = useParams();
  const idParam = (params as any)?.id; // Next pode retornar string|string[]
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
    bairro: "",
    nome_cidade: "",
    nome_estado: "",
    endereco_primario: false,
  });

  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [cidadesCarregadas, setCidadesCarregadas] = useState(false);

  // BrasilAPI (externo) — mantém como está
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const response = await fetch("https://brasilapi.com.br/api/ibge/uf/v1");
        if (!response.ok) {
          throw new Error(`Erro ao carregar estados: ${response.status}`);
        }
        const data = await response.json();
        const estadosFormatados = data.map((estado: Estado) => ({
          sigla: estado.sigla,
          nome: formatarNome(estado.nome),
        }));
        setEstados(estadosFormatados);
      } catch (error) {
        console.error("Erro ao carregar estados:", error);
        toast.error("Erro ao carregar estados", {
          description:
            "Não foi possível carregar a lista de estados. Tente novamente mais tarde.",
        });
      }
    };

    loadEstados();
  }, []);

  const loadCidades = useCallback(
    async (estadoNome: string) => {
      if (!estadoNome) {
        setCidades([]);
        setCidadesCarregadas(true);
        return;
      }

      const estadoEncontrado = estados.find((e) => e.nome === estadoNome);
      const sigla = estadoEncontrado?.sigla;

      if (!sigla) {
        setCidades([]);
        setCidadesCarregadas(true);
        return;
      }

      if (cidadeCache.has(sigla)) {
        setCidades(cidadeCache.get(sigla) || []);
        setCidadesCarregadas(true);
        return;
      }

      try {
        setCidadesCarregadas(false);

        const response = await fetch(
          `https://brasilapi.com.br/api/ibge/municipios/v1/${sigla}?providers=dados-abertos-br,gov,wikipedia`
        );

        if (!response.ok) {
          setCidades([]);
          cidadeCache.set(sigla, []);
          throw new Error(`Erro ao carregar cidades: ${response.status}`);
        }

        const data = await response.json();
        const cidadesFormatadas = Array.isArray(data)
          ? data.map((cidade: any) => ({ nome: formatarNome(cidade.nome) }))
          : [];

        cidadeCache.set(sigla, cidadesFormatadas);
        setCidades(cidadesFormatadas);
      } catch (error) {
        console.error("Erro ao carregar cidades:", error);
        toast.error("Erro ao carregar cidades", {
          description: "Não foi possível carregar a lista de cidades para este estado.",
        });
      } finally {
        setCidadesCarregadas(true);
      }
    },
    [estados]
  );

  // Backend (centralizado)
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
      // NOVO: rota centralizada
      const response = await userRoutes.getEnderecoById(String(id));

      if (!response.ok) {
        throw new Error(await getBackendErrorMessage(response));
      }

      const data = await response.json();

      if (!data?.id) {
        throw new Error("Dados do endereço inválidos ou vazios");
      }

      const nomeEstado =
        estados.find((e) => e.sigla === data.nome_estado)?.nome || data.nome_estado;

      const novoEndereco: Endereco = {
        id: data.id,
        cep: data.cep || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        nome_cidade: formatarNome(data.nome_cidade) || "",
        nome_estado: formatarNome(nomeEstado) || "",
        endereco_primario: Boolean(data.endereco_primario),
      };

      setEndereco(novoEndereco);

      if (novoEndereco.nome_estado) {
        await loadCidades(novoEndereco.nome_estado);
      }

      setError(null);
    } catch (error: any) {
      console.error("[ERROR] Erro ao carregar endereço:", error);
      setError(error?.message || "Erro ao carregar dados do endereço");
      toast.error("Falha ao carregar endereço", {
        description: error?.message || "Verifique sua conexão e tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, loadCidades, estados]);

  useEffect(() => {
    loadEndereco();
  }, [loadEndereco]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEndereco((prev) => ({ ...prev, [name]: value } as Endereco));
  };

  const handleEstadoChange = async (value: string) => {
    setEndereco((prev) => ({
      ...prev,
      nome_estado: value,
      nome_cidade: "",
    }));
    await loadCidades(value);
  };

  const handleCidadeChange = (value: string) => {
    setEndereco((prev) => ({ ...prev, nome_cidade: value }));
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
        !endereco.cep ||
        !endereco.logradouro ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.nome_estado ||
        !endereco.nome_cidade
      ) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const cepNumerico = endereco.cep.replace(/\D/g, "");
      if (cepNumerico.length !== 8) {
        throw new Error("CEP deve conter 8 dígitos");
      }

      const payload: userRoutes.UpdateEnderecoPayload = {
        id: endereco.id,
        cep: cepNumerico,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento,
        bairro: endereco.bairro,
        nome_cidade: endereco.nome_cidade,
        nome_estado: endereco.nome_estado,
        endereco_primario: endereco.endereco_primario,
      };

      // NOVO: rota centralizada
      const response = await userRoutes.updateEndereco(payload);

      if (!response.ok) {
        throw new Error(await getBackendErrorMessage(response));
      }

      toast.success("Endereço atualizado com sucesso!");
      navigate(paths.user());
    } catch (error: any) {
      console.error("[ERROR] Erro ao atualizar endereço:", error);
      toast.error("Falha ao atualizar endereço", {
        description: error?.message || "Tente novamente mais tarde",
      });
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
            <Button onClick={() => navigate(paths.user())}>
              Voltar
            </Button>
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
          <h2 className="text-xl font-bold mb-6">Editar Endereço</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Estado *</Label>
                <Select value={endereco.nome_estado} onValueChange={handleEstadoChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estado">
                      {endereco.nome_estado || "Selecione um estado"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((estado) => (
                      <SelectItem key={estado.nome} value={estado.nome}>
                        {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cidade *</Label>
                <Select
                  value={endereco.nome_cidade}
                  onValueChange={handleCidadeChange}
                  disabled={!endereco.nome_estado || !cidadesCarregadas}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !endereco.nome_estado
                          ? "Selecione um estado primeiro"
                          : !cidadesCarregadas
                          ? "Carregando cidades..."
                          : "Selecione uma cidade"
                      }
                    >
                      {endereco.nome_cidade}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cidades.length > 0 ? (
                      cidades.map((cidade, index) => (
                        <SelectItem key={index} value={cidade.nome}>
                          {cidade.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        {endereco.nome_estado
                          ? "Nenhuma cidade encontrada"
                          : "Selecione um estado primeiro"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
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

              <div>
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

              <div className="flex items-center space-x-2">
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
      <Toaster position="bottom-right" />
    </div>
  );
}
