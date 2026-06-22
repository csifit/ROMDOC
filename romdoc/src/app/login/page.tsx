import LoginForm from "@/components/auth/login-form";
import PublicFooter from "@/components/public/public-footer";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
