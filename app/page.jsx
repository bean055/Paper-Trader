"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ForgotWindow from "./forgot-window";
import "../styles/pages/login.css";
import "../styles/global.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false)


  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true); 
  setError(null);
  try {
    const response = await fetch("/api/credentials/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  } catch (err) {
    setError("Connection error. Try again.");
    setLoading(false);
  }
};

  return (
    <div className="login-page">
      <div className="login-panel">
        
        {showForgot && (
          <ForgotWindow onClose={() => setShowForgot(false)} />
        )}
        <h1>E-PAPER TRADER</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="forgot-container">
            <button type="button" className="forgot" onClick={() => setShowForgot(true)}>Forgot password?</button>
          </div>
          
          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            <img src="/enter.svg" alt="Submit" />
          </button>

          <button
            type="button"
            className="register"
            onClick={() => router.push("/register")}
          >
            REGISTER
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
