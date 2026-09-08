"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flame, Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "../provider/authoprovider";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQs", href: "#faqs" },
];

function getInitials(name?: string | null) {
  if (!name) return "";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstName(name?: string | null) {
  return name?.trim().split(/[\s._-]+/).filter(Boolean)[0] ?? "";
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { userInfo, membership, logout } = useUser();

  // user is a normalized view over userInfo so the rest of the component
  // (image/name/email) reads the same regardless of the backend shape
  const user = userInfo
    ? { image: userInfo.picture, name: userInfo.name, email: userInfo.email }
    : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await logout();
    setShowMenu(false);
    window.location.href = "/";
  };

  const tokenUsagePercent = membership
    ? Math.min(
        100,
        Math.round((membership.tokensUsed / membership.tokenLimit) * 100),
      )
    : 0;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">Socrate</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>

        {/* Desktop auth area */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {membership?.plan && (
                <span className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border text-muted-foreground">
                  <Flame size={11} />
                  {membership.plan.name}
                </span>
              )}

              <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-border bg-background/60 hover:bg-muted/60 transition-colors"
              >
                {user.image ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-black/10">
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      fill
                      sizes="24px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {getInitials(user.name)}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {getFirstName(user.name)}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-muted-foreground transition-transform duration-200 ${
                    showMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 py-2 rounded-2xl border border-border bg-background shadow-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                      {user.image ? (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-black/10">
                          <Image
                            src={user.image}
                            alt={user.name ?? "User"}
                            fill
                            sizes="32px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-tight truncate text-foreground">
                          {user.name}
                        </p>
                        {user.email && (
                          <p className="text-[11px] truncate text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 border-b border-border">
                      {membership && membership.plan ? (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-foreground">
                              {membership.plan.name} plan
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                membership.status === "active"
                                  ? "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                                  : "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400"
                              }`}
                            >
                              {membership.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground mb-1">
                            {membership.tokensUsed.toLocaleString()} /{" "}
                            {membership.tokenLimit.toLocaleString()} tokens
                            used
                          </div>

                          <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                tokenUsagePercent >= 90
                                  ? "bg-red-500"
                                  : tokenUsagePercent >= 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${tokenUsagePercent}%` }}
                            />
                          </div>

                          {membership.endDate && (
                            <p className="text-[10px] mt-1.5 text-muted-foreground">
                              Renews{" "}
                              {new Date(
                                membership.endDate,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            No active plan
                          </span>
                          <Link
                            href="/pricing"
                            onClick={() => setShowMenu(false)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground"
                          >
                            Upgrade
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col py-1 gap-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
                      >
                        <User size={13} />
                        Dashboard
                      </Link>
                    </div>

                    <div className="border-t border-border" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}

              <div className="pt-2">
                {user ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                    {user.image ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-black/10">
                        <Image
                          src={user.image}
                          alt={user.name ?? "User"}
                          fill
                          sizes="32px"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {user.name}
                      </p>
                      {user.email && (
                        <p className="text-[11px] truncate text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-xs font-medium text-red-500 px-2 py-1"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">Log In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/login">Get Started Free</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}