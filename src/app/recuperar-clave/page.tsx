import { PasswordForm } from "@/components/auth/password-form";
export const metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };
export default function RecoverPassword() { return <PasswordForm reset={false} />; }
