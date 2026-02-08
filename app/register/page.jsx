"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/pages/register.css";
import "../../styles/global.css";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);


  const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  try {
    const response = await fetch("/api/credentials/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password}),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Registration failed");
      return;
    }

    router.push("/");
  } catch (err) {
    console.error("Registration error:", err);
    setError("Something went wrong");
  }
};


  return (
    <div className="register-page">
      <div className="register-panel">
        <h1>E-PAPER TRADER</h1>

        <form onSubmit={handleSubmit} className="register-form">
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit">
            <img src="/enter.svg" alt="Submit" />
          </button>

          <button
            type="button"
            className="login"
            onClick={() => router.push("/")}
          >
            Back to login
          </button>
        </form>
      </div>
      <div className="info-box">
          <h3>Welcome to E-Paper Trader!</h3>
          <p>
            Learn and explore the markets safely with our paper trading platform.
          </p>
      </div>
    </div>
  );
}
