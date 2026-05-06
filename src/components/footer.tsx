"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowRightToBracket } from "react-icons/fa6";

export function Footer() {
  const [isLoading] = React.useState(false);

  return (
    <footer className="w-full bg-white text-gray-800 py-10 px-4 shadow-inner">
      {/* LAYOUT RESPONSIVO COMPLETO */}
      <div className="max-w-7xl mx-auto">
        {/* TELAS GRANDES E MÉDIAS */}
        <div className="hidden md:flex flex-col md:flex-row md:justify-between md:items-start gap-10">
          {/* COLUNA 1 - LINKS */}
          <div className="w-full md:w-1/3 flex justify-center md:justify-start">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-center md:text-left">
              <a href="#" className="hover:text-[#09BC8A]">
                Política de troca
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Crie sua conta
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Perguntas frequentes
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Trabalhe conosco
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Política de privacidade
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Anuncie na Bikes.com.br
              </a>
            </div>
          </div>

          {/* COLUNA 2 - LOGO + ÍCONES */}
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <img src="/img/logo.png" alt="Logo" className="w-32 mb-4" />
            <div className="flex gap-3">
              <a
                href="https://wa.me/"
                target="_blank"
                aria-label="WhatsApp"
                rel="noreferrer">
                <div className="bg-[#0C1B33] rounded-full">
                  <img
                    src="/img/whatsapp-footer.png"
                    className="h-7 w-7"
                    alt="WhatsApp"
                  />
                </div>
              </a>
              <a
                href="https://instagram.com/"
                target="_blank"
                aria-label="Instagram"
                rel="noreferrer">
                <div className="bg-[#0C1B33] rounded-full">
                  <img
                    src="/img/instagram-footer.png"
                    className="h-7 w-7"
                    alt="Instagram"
                  />
                </div>
              </a>
              <a
                href="https://facebook.com/"
                target="_blank"
                aria-label="Facebook"
                rel="noreferrer">
                <div className="bg-[#0C1B33] rounded-full">
                  <img
                    src="/img/facebook-footer.png"
                    className="h-7 w-7"
                    alt="Facebook"
                  />
                </div>
              </a>
            </div>
          </div>

          {/* COLUNA 3 - NEWSLETTER */}
          <div className="w-full md:w-1/3 text-center md:text-right">
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Assine nossa Newsletter
            </label>
            <div className="flex flex-col items-center md:items-end gap-3">
              <Input
                type="email"
                id="email"
                placeholder="E-mail"
                className="w-64 border-2 border-[#09BC8A] rounded-md px-3 py-2 text-sm"
                required
              />
              <Button
                disabled={isLoading}
                className="bg-gradient-to-r from-[#09BC8A] to-[#0C1B33] text-white px-6 py-2 rounded-full text-sm"
              >
                {isLoading ? (
                  "..."
                ) : (
                  <>
                    Assinar <FaArrowRightToBracket className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* TELAS PEQUENAS */}
        <div className="flex flex-col gap-10 md:hidden">
          {/* LOGO */}
          <div className="flex justify-center">
            <img src="/img/logo.png" alt="Logo" className="w-32 mb-4" />
          </div>

          {/* LINKS EM DUAS COLUNAS */}
          <div className="w-full flex justify-center">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-center">
              <a href="#" className="hover:text-[#09BC8A]">
                Política de troca
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Crie sua conta
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Perguntas frequentes
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Trabalhe conosco
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Política de privacidade
              </a>
              <a href="#" className="hover:text-[#09BC8A]">
                Anuncie na Bikes.com.br
              </a>
            </div>
          </div>

          {/* ÍCONES SOCIAIS */}
          <div className="flex justify-center gap-3">
            <a
              href="https://wa.me/"
              target="_blank"
              aria-label="WhatsApp"
              rel="noreferrer">
              <div className="bg-[#0C1B33] rounded-full">
                <img
                  src="/img/whatsapp-footer.png"
                  className="h-7 w-7"
                  alt="WhatsApp"
                />
              </div>
            </a>
            <a
              href="https://instagram.com/"
              target="_blank"
              aria-label="Instagram"
              rel="noreferrer">
              <div className="bg-[#0C1B33] rounded-full">
                <img
                  src="/img/instagram-footer.png"
                  className="h-7 w-7"
                  alt="Instagram"
                />
              </div>
            </a>
            <a
              href="https://facebook.com/"
              target="_blank"
              aria-label="Facebook"
              rel="noreferrer">
              <div className="bg-[#0C1B33] rounded-full">
                <img
                  src="/img/facebook-footer.png"
                  className="h-7 w-7"
                  alt="Facebook"
                />
              </div>
            </a>
          </div>

          {/* NEWSLETTER */}
          <div className="text-center">
            <label htmlFor="email" className="block text-sm font-medium mb-2 w-64 mx-auto">
              Assine nossa Newsletter
            </label>
            <div className="flex flex-col items-center gap-3">
              <Input
                type="email"
                id="email"
                placeholder="E-mail"
                className="w-64 border-2 border-[#09BC8A] rounded-md px-3 py-2 text-sm"
                required
              />
              <Button
                disabled={isLoading}
                className="bg-gradient-to-r from-[#09BC8A] to-[#0C1B33] text-white py-2 rounded-full text-sm">
                {isLoading ? (
                  "..."
                ) : (
                  <>
                    Assinar <FaArrowRightToBracket className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ INFERIOR */}
      <div className="border-t mt-8 pt-4 text-xs flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-2 px-2">
        <p>Bikes.com.br | Todos os direitos reservados</p>
        <p>Produzido por: Agência Cariri</p>
      </div>
    </footer>
  );
}
