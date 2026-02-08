"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import "../../styles/navbar.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

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
      const response = await fetch("/api/credentials/logout", { method: "POST" });
      if (response.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
