"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthRole } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("CLIENT");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      await login({ email, password, role });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Enter your email first for Google login");
      return;
    }

    try {
      await loginWithGoogle({ email, role });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    }
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Enter your email first");
      return;
    }

    try {
      const responseMessage = await forgotPassword(email);
      setMessage(responseMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forgot password request failed");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6 text-center">Login</h1>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mb-3 text-sm text-green-600">{message}</p> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as AuthRole)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="CLIENT">CLIENT</option>
              <option value="THERAPIST">THERAPIST</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isLoading ? "Please wait..." : "Login"}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 flex items-center justify-center gap-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.6c-.2 1.4-1 2.7-2.2 3.5v2.9h3.6c2.1-2 3-4.9 3-8.5z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.6-2.9c-1 .7-2.2 1.1-3 1.1-2.4 0-4.4-1.6-5.1-3.8H3.2v3c1.7 3.3 5 5 8.8 5z"
                fill="#34A853"
              />
              <path
                d="M6.9 14c-.2-.7-.3-1.3-.3-2s.1-1.4.3-2V7H3.2C2.4 8.6 2 10.3 2 12s.4 3.4 1.2 5l3.7-3z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.2c1.4 0 2.7.5 3.7 1.4L18.5 5c-1.7-1.6-3.9-3-6.5-3-3.8 0-7.1 2.2-8.8 5l3.7 3c.7-2.2 2.7-3.8 5.1-3.8z"
                fill="#EA4335"
              />
            </svg>
            Login with Google
          </button>

          <div className="flex items-center justify-between text-sm pt-1">
            <button type="button" onClick={handleForgotPassword} className="text-zinc-700 hover:text-zinc-900 underline">
              Forgot Password?
            </button>
            <Link href="/" className="text-zinc-700 hover:text-zinc-900 underline">
              Go to Home
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
