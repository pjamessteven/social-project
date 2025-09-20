"use client";

import { Menu, MessageCircleHeart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogTrigger } from "../../dialog";
import { cn } from "../../lib/utils";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href}>
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "rounded-full px-4 transition-all",
          isActive && "bg-black/5",
        )}
      >
        {label}
      </Button>
    </Link>
  );
}

export default function Header({ mode }: { mode: "detrans" | "affirm" }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";
  const devAffirm = isDev && mode === "affirm";
  return (
    <div
      className={cn(
        "border-bottom top-0 right-0 left-0 z-50 flex items-center justify-between p-2 px-4",
        mode === "affirm" || true ? "bg-transparent" : "bg-white dark:bg-black",
      )}
    >
      <Link
        href={isDev && mode === "affirm" ? "/affirm" : "/"}
        className="!cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <MessageCircleHeart className="size-6" />
          <h1 className="font-semibold">
            {mode === "affirm" ? "genderaffirming.ai" : "detrans.ai"}&nbsp;
            {/*
            <span className="font-base regular hidden font-light italic opacity-30 sm:inline">
              {" "}
              | Blossom & Grow
            </span> */}
          </h1>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {/* Desktop Navigation - hidden on mobile */}
        <div className="hidden items-center justify-end gap-0.5 p-1 md:flex">
          <NavLink href={!devAffirm ? "/" : "/affirm"} label="Portal" />
          <NavLink
            href={!devAffirm ? "/prompts" : "/affirm/prompts"}
            label="System Prompts"
          />
          <NavLink
            href={!devAffirm ? "/terms" : "/affirm/terms"}
            label="Terms"
          />
          <NavLink
            href={!devAffirm ? "/contact" : "/affirm/contact"}
            label="Contact"
          />
        </div>
        {/* Donate Button - Always visible */}
        <Link
          href={!devAffirm ? "/donate" : "/affirm/donate"}
          className="hidden md:block"
        >
          <Button size={"sm"} variant={"destructive"}>
            Donate
          </Button>
        </Link>

        {/* Mobile Menu */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setIsOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed right-0 top-0 h-full w-80 max-w-80 translate-x-0 translate-y-0 rounded-none border-l p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-col space-y-2">
                <Link
                  href={!devAffirm ? "/" : "/affirm"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      pathname === "/" && "bg-muted",
                    )}
                  >
                    Portal
                  </Button>
                </Link>
                <Link
                  href={!devAffirm ? "/prompts" : "/affirm/prompts"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      pathname === "/prompts" && "bg-muted",
                    )}
                  >
                    System Prompts
                  </Button>
                </Link>
                <Link
                  href={!devAffirm ? "/terms" : "/affirm/terms"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      pathname === "/terms" && "bg-muted",
                    )}
                  >
                    Terms
                  </Button>
                </Link>
                <Link
                  href={!devAffirm ? "/contact" : "/affirm/contact"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      pathname === "/contact" && "bg-muted",
                    )}
                  >
                    Contact
                  </Button>
                </Link>
                <Link
                  href={!devAffirm ? "/donate" : "/affirm/donate"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="destructive"
                    className="mt-2 w-full justify-start"
                  >
                    Donate
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Donate Button - Mobile always visible */}
        <Link href="/donate" className="hidden md:hidden">
          <Button variant={"destructive"} size={"sm"}>
            Donate
          </Button>
        </Link>
      </div>
    </div>
  );
}
