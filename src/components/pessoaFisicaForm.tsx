"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FaArrowRight, FaArrowLeft, FaArrowRightToBracket } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"
import { FaFacebook } from "react-icons/fa"
import { IoEyeSharp, IoEyeOffSharp } from "react-icons/io5"
import { Link } from "react-router-dom"

type DeviceType = "mobile" | "tablet" | "laptop" | "desktop"

interface PessoaFisicaFormProps {
  formData: {
    nome_completo: string
    email: string
    telefone_celular: string
    data_nascimento: string
    cpf_cnpj: string
    senha: string
  }
  errors: {
    nome_completo: string
    email: string
    telefone_celular: string
  }
  deviceType: DeviceType
  currentPage: number
  totalPages: number
  showPassword: boolean
  isLoading: boolean
  termsAccepted: boolean
  validateCurrentPage: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  setShowPassword: (show: boolean) => void
  setTermsAccepted: (accepted: boolean) => void
  nextPage: () => void
  prevPage: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

export default function PessoaFisicaForm({
  formData,
  errors,
  deviceType,
  currentPage,
  totalPages: _totalPages,
  showPassword,
  isLoading,
  termsAccepted,
  validateCurrentPage,
  handleChange,
  handleBlur,
  setShowPassword,
  setTermsAccepted,
  nextPage,
  prevPage,
  handleSubmit,
}: PessoaFisicaFormProps) {
  if (currentPage === 2) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium">Confirmação de Dados</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className={`grid ${deviceType === "mobile" ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
            <div className="break-words overflow-hidden">
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium break-all">{formData.nome_completo}</p>
            </div>
            <div className="break-words overflow-hidden">
              <p className="text-sm text-gray-500">E-mail</p>
              <p className="font-medium break-all">{formData.email}</p>
            </div>
            <div className="break-words overflow-hidden">
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-medium break-all">{formData.telefone_celular}</p>
            </div>
            <div className="break-words overflow-hidden">
              <p className="text-sm text-gray-500">CPF</p>
              <p className="font-medium break-all">{formData.cpf_cnpj}</p>
            </div>
            <div className="break-words overflow-hidden">
              <p className="text-sm text-gray-500">Data Nasc.</p>
              <p className="font-medium break-all">{formData.data_nascimento}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Senha</p>
          <p className="font-medium">••••••••</p>
        </div>

        <div className="mt-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              className="mt-1 form-checkbox h-4 w-4 text-[#09bc8a]"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <span className="ml-2 text-sm">
              Concordo com os{" "}
              <a href="#" className="text-[#09bc8a]">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="#" className="text-[#09bc8a]">
                Política de Privacidade
              </a>
            </span>
          </label>
        </div>

        <div className={`flex justify-between w-full ${deviceType === "mobile" ? "mt-4" : "mt-6"}`}>
          <Button
            type="button"
            onClick={prevPage}
            className="flex items-center gap-2 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90"
          >
            <FaArrowLeft /> Voltar
          </Button>

          <Button
            type="submit"
            className="flex items-center gap-2 ml-auto bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90"
            disabled={isLoading || !termsAccepted}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Cadastrar <FaArrowRightToBracket />
              </>
            )}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      { (
        <div className={`mb-3 w-full ${deviceType === "tablet" ? "flex flex-col space-y-2" : ""}`}>
          <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 mb-3">
            <FcGoogle /> Continuar com Google
          </Button>
          <Button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <FaFacebook /> Continuar com Facebook
          </Button>
        </div>
      )}

      <div className="space-y-4 w-full">
        <div className="w-full">
          <Label htmlFor="nome" className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}>
            Nome <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nome"
            name="nome_completo"
            type="text"
            value={formData.nome_completo}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Digite seu nome completo"
            required
            className={`w-full ${errors.nome_completo ? "border-red-500" : ""}`}
          />
          {errors.nome_completo && <p className="mt-1 text-sm text-red-600">{errors.nome_completo}</p>}
        </div>

        <div
          className={`flex ${deviceType === "mobile" ? "flex-col space-y-4" : "flex-row space-y-0 space-x-4"} w-full`}
        >
          <div className="w-full md:w-1/2">
            <Label htmlFor="email" className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}>
              E-mail <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="m@example.com"
              required
              className={`w-full ${errors.email ? "border-red-500" : ""}`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          <div className="w-full md:w-1/2">
            <Label htmlFor="telefone" className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}>
              Telefone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telefone"
              name="telefone_celular"
              type="text"
              value={formData.telefone_celular}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="(XX) XXXXX-XXXX"
              maxLength={15}
              required
              className={`w-full ${errors.telefone_celular ? "border-red-500" : ""}`}
            />
            {errors.telefone_celular && <p className="mt-1 text-sm text-red-600">{errors.telefone_celular}</p>}
          </div>
        </div>

        <div
          className={`flex ${deviceType === "mobile" ? "flex-col space-y-4" : "flex-row space-y-0 space-x-4"} w-full`}
        >
          <div className="w-full md:w-1/2">
            <Label htmlFor="cpf_cnpj" className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}>
              CPF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cpf_cnpj"
              name="cpf_cnpj"
              type="text"
              value={formData.cpf_cnpj}
              onChange={handleChange}
              placeholder="Digite seu CPF"
              maxLength={14}
              required
              className="w-full"
            />
          </div>
          <div className="w-full md:w-1/2">
            <Label
              htmlFor="data_nascimento"
              className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}
            >
              Data Nasc. <span className="text-red-500">*</span>
            </Label>
            <Input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
        </div>

        <div className="w-full">
          <Label htmlFor="senha" className={`${deviceType === "mobile" ? "text-sm" : "text-base"} text-gray-700`}>
            Senha <span className="text-red-500">*</span>
          </Label>
          <div className="relative w-full">
            <Input
              id="senha"
              name="senha"
              type={showPassword ? "text" : "password"}
              value={formData.senha}
              onChange={handleChange}
              placeholder="Digite sua senha"
              required
              minLength={6}
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <IoEyeOffSharp size={20} /> : <IoEyeSharp size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`flex justify-between w-full ${deviceType === "mobile" ? "mt-4" : "mt-6"}`}>
        <div></div> {/* Empty div for spacing */}
        <Button
          type="button"
          onClick={nextPage}
          disabled={!validateCurrentPage}
          className={`flex items-center gap-2 ml-auto bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90 ${
            !validateCurrentPage ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          Próximo <FaArrowRight />
        </Button>
      </div>

      <p
        className={`mt-3 text-center ${
          deviceType === "mobile" ? "text-sm" : "text-base"
        } font-medium text-black w-full`}
      >
        Já tem uma conta?{" "}
        <Link
          to="/login"
          className="text-[#09bc8a] hover:underline hover:text-[#000000] underline decoration-solid"
        >
          Faça login
        </Link>
      </p>
    </form>
  )
}
