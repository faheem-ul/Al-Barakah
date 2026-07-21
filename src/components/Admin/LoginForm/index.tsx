"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import logo from "@/public/logo.png";

// LoginForm component
const LoginForm: React.FC = () => {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Handle submit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/admin/reviews");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
      <Link href="/" className="block">
      <Image src={logo} alt="Albaraka Honey" className="w-[140px] cursor-pointer" />
      </Link>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-5 bg-white border border-black/10 p-8"
      >
        <div className="text-center">
          <Text className="text-[24px] font-semibold text-black">
            Admin Login
          </Text>
          <Text className="text-[14px] text-[#6B6B6B] mt-1">
            Sign in to access the admin dashboard.
          </Text>
        </div>

        {error && <Text className="text-[14px] text-red-600">{error}</Text>}

        <div className="space-y-2">
          <label htmlFor="admin-email" className="text-[14px] font-medium">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 border border-black/20 rounded-md text-[15px] focus:outline-none focus:border-black"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-[14px] font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 pr-11 border border-black/20 rounded-md text-[15px] focus:outline-none focus:border-black"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-black"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          isLoading={submitting}
          fill="#ffffff"
          className="w-full justify-center rounded-md bg-black text-white hover:opacity-90"
        >
          Sign in
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
