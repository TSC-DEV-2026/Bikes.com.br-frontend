import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"

export const AuthTransitionWrapper = ({ 
  children,
  type = "form"
}: { 
  children: React.ReactNode,
  type?: "form" | "image"
}) => {
  const { pathname } = useLocation()

  // Configurações de animação para formulário
  const formAnimation = {
    login: {
      enter: { x: "100%", opacity: 0 },
      active: { x: 0, opacity: 1 },
      exit: { x: "-100%", opacity: 0 }
    },
    register: {
      enter: { x: "-100%", opacity: 0 },
      active: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 }
    }
  }

  // Configurações de animação para imagem
  const imageAnimation = {
    login: {
      enter: { x: "-100%", opacity: 0 },
      active: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 }
    },
    register: {
      enter: { x: "100%", opacity: 0 },
      active: { x: 0, opacity: 1 },
      exit: { x: "-100%", opacity: 0 }
    }
  }

  const animationConfig = type === "form" ? formAnimation : imageAnimation
  const currentAnimation = pathname === "/login" ? animationConfig.login : animationConfig.register

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={currentAnimation.enter}
        animate={currentAnimation.active}
        exit={currentAnimation.exit}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.7
        }}
        className={type === "image" ? "absolute inset-0" : "w-full h-full"}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}