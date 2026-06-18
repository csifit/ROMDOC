import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F0EEE9] px-6 py-12">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}