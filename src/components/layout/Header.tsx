import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, User, LogOut, Shield, MessageCircle, Search } from "lucide-react";

import { useState } from "react";
import logoImg from "@/assets/logo.jpeg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
      setMobileOpen(false);
    }
  };

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value ?? ""; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const whatsappNumber = settings?.whatsapp_number?.replace(/\s+/g, "") ?? "";
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace("+", "")}` : null;

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/our-story", label: "Our Story" },
    { to: "/books", label: "Books" },
    { to: "/articles", label: "Articles" },
    { to: "/services", label: "Services" },
    { to: "/support-us", label: "Support Us" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="w-full max-w-screen-2xl mx-auto flex h-[68px] md:h-[76px] items-center justify-between px-3 md:px-6">
        {/* Logo */}
        <Link
          to={user ? "/dashboard" : "/"}
          className="group flex items-center gap-2 sm:gap-3 shrink-0 py-1"
          aria-label={user ? "GyandootNova — Go to your dashboard" : "GyandootNova — Go to homepage"}
        >
          <div className="relative flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 max-h-14 max-w-14 shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-gold opacity-30 blur-sm transition-opacity group-hover:opacity-50" aria-hidden="true" />
            <img
              src={logoImg}
              alt="GyandootNova logo"
              width={56}
              height={56}
              loading="eager"
              decoding="async"
              {...({ fetchpriority: "high" } as any)}
              className="relative block h-full w-full max-h-full max-w-full rounded-full object-contain p-0.5 bg-white shadow-elegant ring-2 ring-gold transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3"
            />
          </div>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif text-lg md:text-2xl tracking-tight text-foreground font-semibold">
              Gyandoot<span className="gradient-text-gold">Nova</span>
            </span>
            <span className="mt-0.5 font-sans text-[10px] md:text-[12px] font-medium tracking-[0.08em] text-muted-foreground">
              Modern Design <span className="opacity-50" aria-hidden="true">•</span> Trust <span className="opacity-50" aria-hidden="true">•</span> Usability
            </span>
          </span>
        </Link>




        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="link-underline text-[13px] xl:text-sm font-medium text-foreground/75 transition-colors hover:text-primary px-1.5 xl:px-2 py-1.5 whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="link-underline flex items-center gap-1 text-[13px] lg:text-sm font-medium text-primary px-2 py-1.5">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        {/* Right actions — currency + search stay visible on every screen size */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-1" role="search" aria-label="Site search">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                aria-label="Search books"
                className="h-8 w-24 sm:w-32 xl:w-40"
                autoFocus
              />
              <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" aria-label="Submit search">
                <Search className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)} aria-label="Search books">
              <Search className="h-4 w-4" />
            </Button>
          )}
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md text-primary hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden lg:inline-flex h-8 gap-1 text-xs" aria-label="Open user menu">
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline max-w-[80px] truncate">{user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>My Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/library")}>My Library</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>My Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" className="hidden lg:inline-flex h-8 text-xs" onClick={() => navigate("/auth")}>
              <User className="mr-1 h-3.5 w-3.5" /> Sign In
            </Button>
          )}

          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 lg:hidden max-h-[calc(100vh-68px)] overflow-y-auto">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm font-medium" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <form onSubmit={handleSearch} className="flex items-center gap-2" role="search" aria-label="Site search (mobile)">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books..."
                aria-label="Search books"
                className="h-9 flex-1"
              />
              <Button type="submit" size="sm" variant="outline" aria-label="Submit search">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-primary"
                onClick={() => setMobileOpen(false)}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp Us
              </a>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>
                Admin Panel
              </Link>
            )}
            {user ? (
              <div className="flex flex-col gap-2">
                <Link to="/profile" className="text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>
                  My Profile
                </Link>
                <Button variant="outline" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>
                Sign In
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
