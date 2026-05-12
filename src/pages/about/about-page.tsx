import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BackButton } from "@/components/back-button"

const About = () => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          {/* Banner com imagem de fundo - Versão corrigida */}
          <div className="relative w-full h-[250px] md:h-[368px] flex justify-center items-center overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
              <img 
                src="/img/fundo-about.png" 
                alt="Fundo" 
                className="absolute inset-0 h-full w-full object-cover"
                fetchPriority="high"
                style={{ 
                  objectPosition: 'center 70%',
                  top: '20%' // Desloca 20% para baixo // Ajusta apenas o foco da imagem
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pt-10">
              <h1 className="text-white text-3xl md:text-4xl font-bold text-center w-full">
                Quem somos
              </h1>
            </div>
          </div>

          {/* Restante do conteúdo permanece igual */}
          <div className="container mx-auto px-4 py-8 md:py-16">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Seção de texto */}
              <div className="w-full lg:w-5/12 text-[#0C1B33] space-y-4 font-['Gill_Sans']">
                <h1 className="text-xl font-black font-['Segoe_UI']">Quem somos</h1>
                <p className="text-base md:text-lg">
                  A Bikes.com.br está sendo pensada para se tornar a referência nacional quando se tratar das atividades
                  relacionadas ao ciclismo. Sejam elas, atividades de lazer, competições, organização de eventos, compra
                  e venda de Bikes novas e usadas, acessórios, peças, nutrição e muito mais...
                </p>
                <p className="text-base md:text-lg">
                  Nos posicionamos como uma Startup ligada ao ecossistema tecnológico fomentado no Sudoeste do Paraná, a
                  empresa nasce com o objetivo de entregar valor para todos os envolvidos no mundo das Bikes. Nasce do
                  sonho de seus Cofundadores, Gustavo Eduardo Terra e Eduardo Gaspareto, com o objetivo de criar um
                  negócio sustentável, promissor, socialmente correto, mas principalmente fomentar a prática de um
                  esporte fantástico que traz muita possibilidade. Vem com a gente!!! Clique aqui para ser avisado do
                  lançamento. Deus abençoe!!!
                </p>
              </div>

              {/* Grid de imagens */}
              <div className="w-full lg:w-7/12">
                <div className="grid grid-cols-2 gap-2 sm:gap-4"
                  style={{
                    gridTemplateAreas: "'img1 img3' 'img2 img3'"
                  }}>
                  
                  <div className="relative w-full aspect-[4/3]" style={{ gridArea: "img1" }}>
                    <img 
                      src="/img/Group 35.jpg" 
                      alt="Imagem 1" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  
                  <div className="relative w-full aspect-[4/3]" style={{ gridArea: "img2" }}>
                    <img 
                      src="/img/Group 34.jpg" 
                      alt="Imagem 2" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  
                  <div className="relative w-full aspect-[4/5] sm:aspect-[3/4]" style={{ gridArea: "img3" }}>
                    <img 
                      src="/img/Group 36.jpg" 
                      alt="Imagem 3" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default About