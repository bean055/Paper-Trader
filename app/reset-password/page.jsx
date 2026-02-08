"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../../styles/pages/reset.css";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/credentials/reset-login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <p className="reset-error">Invalid reset link</p>;
  }

  return (
    <div className="reset-page">
        <h1>E-Paper Trader</h1>
      <form onSubmit={handleSubmit} className="reset-card">
        <h2>Reset Password</h2>

        {!success ? (
          <>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="reset-input"
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="reset-input"
            />

            {error && <p className="reset-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="reset-button"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        ) : (
          <p className="reset-success">
            Password updated. Redirecting to login…
          </p>
        )}
      </form>
    </div>
  );
}
