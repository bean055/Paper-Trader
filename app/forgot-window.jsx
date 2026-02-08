"use client";

import { useState } from "react";
import "../styles/pages/forgot.css";

export default function ForgotWindow({ onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/credentials/reset-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError("Failed to send reset email");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-overlay">
      <div className="forgot-window">
        <h2>Reset Password</h2>

        {!success ? (
          <form onSubmit={handleForgotPassword}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <p className="error">{error}</p>}

            <div className="forgot-fields">
              <button type="submit" disabled={loading} className="submit">
                {loading ? "Sending..." : "Send Reset Email"}
              </button>
              <button type="button" onClick={onClose} className="cancel">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="success">
              Password reset email sent. Check your inbox.
            </p>
            <button onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
