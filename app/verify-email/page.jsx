"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../../styles/pages/email_verify.css";

export default function VerifyEmailPage() {
  return (
    <div className="verify-email">
      <Suspense fallback={<div className="verify-card"><h1>Loading...</h1></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(
          `/api/credentials/verify?token=${token}`
        );

        if (!response.ok) {
          setStatus("error");
          return;
        }

        setStatus("success");

        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (err) {
        setStatus("error");
        console.error(err);
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="verify-email">
      <div className="verify-card">
        <h1>Email Verification</h1>

        {status === "verifying" && (
          <div className="verify-spinner" />
        )}

        {status === "success" && (
          <div className="verify-icon">
          <img
            src="/tick.svg"
            alt="Email verified"
            style={{ width: "48px", marginTop: "1rem" }}
          />
          </div>
        )}

        {status === "error" && (
          <div className="verify-icon">
          <img
            src="/cross.svg"
            alt="Email verification failed"
            style={{ width: "48px", marginTop: "1rem" }}
          />
          </div>
        )}
      </div>
    </div>
  );
}
