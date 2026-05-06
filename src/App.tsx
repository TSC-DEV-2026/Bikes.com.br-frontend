import { Routes, Route } from "react-router-dom";
import { NavigationEffects } from "@/components/navigation-effects";

import LandingPage from "@/app/page";
import HomePage from "@/app/home/page";
import AboutPage from "@/app/about/page";
import EnterprisePage from "@/app/enterprise/page";
import UserPage from "@/app/user/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import PasswordPage from "@/app/password/page";
import ResetPasswordPage from "@/app/resetPassword/page";
import EditAddressPage from "@/app/editAddress/[id]/page";

export default function App() {
  return (
    <>
      <NavigationEffects />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password" element={<PasswordPage />} />
        <Route path="/resetPassword" element={<ResetPasswordPage />} />
        <Route path="/editAddress/:id" element={<EditAddressPage />} />
      </Routes>
    </>
  );
}
