"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import "../../styles/navbar.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAlerts = async () => {
      const COOLDOWN = 5 * 60 * 1000; 
      const lastCheck = localStorage.getItem("lastAlertCheck");
      const now = Date.now();

      if (lastCheck && now - parseInt(lastCheck) < COOLDOWN) {
        return; 
      }

      try {
        const response = await fetch("/api/alerts"); 
        const data = await response.json();

        if (data.triggered && data.alerts) {
          data.alerts.forEach((alert) => {
            const config = conditionMap[alert.condition_type] || { label: "Alert triggered", color: "#ffffff" };
            
            const isPercent = alert.condition_type.includes("pct");
            const symbol = isPercent ? "%" : "$";

            toast.success(`Alert: ${alert.ticker}`, {
              description: (
                <div style={{ color: config.color, fontWeight: "500" }}>
                  {config.label} {isPercent ? "" : symbol}{alert.target_value}{isPercent ? symbol : ""} 
                  <span style={{ color: "#ffffff", marginLeft: "8px" }}>
                    (Now: ${alert.current_price})
                  </span>
                </div>
              ),
              duration: 5000, 
            });
          });
        }
        localStorage.setItem("lastAlertCheck", now.toString());
      } catch (error) {
        console.error("Failed to check alerts:", error);
      }
    };
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => checkAlerts(), { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(checkAlerts, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const navItems = [
    { name: "Notes", href: "/notes" },
    { name: "News", href: "/news" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Trade", href: "/trade" },
    { name: "Charts", href: "/Charts" },
    { name: "Learn", href: "/Learn" },
  ];
  const handleLogout = async () => {
    try {
      localStorage.removeItem("lastAlertCheck")
      const response = await fetch("/api/credentials/logout", { method: "POST" });
      if (response.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const conditionMap = {
    price_above: { label: "Price rose above", color: "#24ff74" },
    price_below: { label: "Price dropped below", color: "#f55757" }, 
    pct_change_positive: { label: "Gained over", color: "#24ff74" },
    pct_change_negative: { label: "Dropped over", color: "#f55757" },
  };
  return (
    <nav className="navbar">
      <div className = "navbar-container">
        <ul className="navbar-menu">
          {navItems.map((item) => (
            <li key={item.href} className="navbar-item">
              <Link 
                href={item.href} 
                className={`navbar-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>   
        </div> 
    </nav>
  );
}
