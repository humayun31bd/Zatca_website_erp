"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Settings, HelpCircle, Moon, Sun, LogOut, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Sidebar({ isAgency }: { isAgency?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col h-full shadow-sm">
      <div className="h-16 flex items-center px-6 border-b dark:border-gray-700 font-bold text-xl text-primary-600 dark:text-primary-400">
        UAE Invoice
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {[
            { name: "Dashboard", href: "/", icon: LayoutDashboard },
            { name: "Invoices", href: "/invoices", icon: FileText },
            ...(isAgency ? [{ name: "Clients", href: "/clients", icon: Users }] : []),
            { name: "Settings", href: "/settings", icon: Settings },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t dark:border-gray-700 space-y-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            Toggle Theme
          </button>
        )}
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md">
          <HelpCircle className="h-5 w-5" />
          Help & Support
        </button>
        <button 
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
        >
          {loggingOut ? (
            <div className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          Log Out
        </button>
      </div>
    </div>
  );
}
