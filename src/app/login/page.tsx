import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            lil sweet treat
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fulfillment &amp; Order Exception Tracker
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
