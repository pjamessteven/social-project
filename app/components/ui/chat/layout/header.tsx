"use client";

import DonationCard from "@/app/components/content/DonationCard";
import { Menu, MessageCircleHeart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogTrigger } from "../../dialog";
import { cn } from "../../lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../../navigation-menu";

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
          isActive && "bg-accent",
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

          <NavigationMenu className="ml-2">
            <NavigationMenuList>
              {/* Resources Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-full px-4 text-sm font-medium">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-68 gap-1 p-1">
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/studies" : "/affirm/studies"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          Studies
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          Academic research and studies
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={"/definitions"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          Definitions
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          Key terms and concepts
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={"/support"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          Get Detransition Support
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          Find community and therapists
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* About Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-full px-4 text-sm font-medium">
                  About
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-68 gap-1 p-1">
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/prompts" : "/affirm/prompts"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          System Prompts
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          View the AI system prompts
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/terms" : "/affirm/terms"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          Terms
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          Privacy policy and terms
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/contact" : "/affirm/contact"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <div className="text-sm leading-none font-medium">
                          Contact
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                          Get in touch with Peter
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
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
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </DialogTrigger>
          <DialogContent
            showOverlay={false}
            className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 !top-[56px] h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none border-none p-0"
          >
            <div className="flex h-full flex-col justify-between overflow-y-auto p-4">
              <div className="flex w-full flex-col space-y-2">
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

                {/* Resources Section */}
                <div className="pt-2">
                  <h3 className="text-muted-foreground mb-2 px-3 text-sm font-medium">
                    Resources
                  </h3>
                  <Link
                    href={!devAffirm ? "/studies" : "/affirm/studies"}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        pathname === "/studies" && "bg-muted",
                      )}
                    >
                      Academic Research & Studies
                    </Button>
                  </Link>
                  <Link
                    href={!devAffirm ? "/definitions" : "/affirm/definitions"}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        pathname === "/definitions" && "bg-muted",
                      )}
                    >
                      Word Definitions
                    </Button>
                  </Link>
                  <Link
                    href={!devAffirm ? "/facts" : "/affirm/facts"}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        pathname === "/support" && "bg-muted",
                      )}
                    >
                      Support
                    </Button>
                  </Link>
                </div>

                {/* About Section */}
                <div className="pt-2">
                  <h3 className="text-muted-foreground mb-2 px-3 text-sm font-medium">
                    About
                  </h3>
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
                </div>
              </div>
              <div className="mt-4 pb-16">
                <DonationCard mode={mode} />
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
