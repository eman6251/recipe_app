import { ChefHat } from "lucide-react";
import { InstallPrompt } from "@/components/install-prompt";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ChefHat className="h-10 w-10 text-amber-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Skillet</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your kitchen
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {message}
          </p>
        ) : null}

        <LoginForm next={next ?? "/"} />
      </div>

      <InstallPrompt />
    </div>
  );
}
