"use client";

import DonationCard from "@/app/components/content/DonationCard";
import {
  ArrowLeftRight,
  BookOpen,
  ChartNoAxesCombined,
  ExternalLink,
  FileText,
  Heart,
  HelpCircle,
  Home,
  Mail,
  Menu,
  MessageCircleHeart,
  Scroll,
  Settings,
  X,
  Youtube,
} from "lucide-react";
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
          "ml-2 rounded-full px-4 transition-all",
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
          <NavLink href={"/compare"} label="Compare" />

          <NavigationMenu className="ml-2">
            <NavigationMenuList>
              {/* Resources Menu */}
              {mode === "detrans" && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-full bg-transparent px-4 text-sm font-medium">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-68 gap-1 p-1">
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/support"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <Heart className="mr-2 h-6 w-6" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              Get Support
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Find community and therapists
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/definitions"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <FileText className="mr-2 h-8 w-8" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              Definitions
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Key terms and concepts
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/stories"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <div>
                            <Youtube className="mr-2 h-6 w-6" />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              Personal Stories
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Videos from those who have been through it
                              themselves
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/studies"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <BookOpen className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              Peer-reviewed Studies
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Relevant academic research
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <a
                          href="https://statsforgender.org/"
                          target="_blank"
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center justify-between gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <div className="flex flex-row items-center">
                            <ChartNoAxesCombined className="mt-0.5 mr-5 h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                Verified Statistics
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                                statsforgender.org
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="ml-2 h-4" />
                        </a>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}
              {/* About Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-full bg-transparent px-4 text-sm font-medium">
                  About
                </NavigationMenuTrigger>

                <NavigationMenuContent>
                  <div className="grid w-68 gap-1 p-1">
                    {mode !== "affirm" && false && (
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/about"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <Scroll className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              About
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Understand why I built this
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    )}
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/contact" : "/affirm/contact"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <Mail className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            Contact
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            Get in touch with me
                          </p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/prompts" : "/affirm/prompts"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <Settings className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            System Prompts
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            View the AI system prompts
                          </p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/terms" : "/affirm/terms"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <HelpCircle className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            Terms
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            Privacy policy and terms
                          </p>
                        </div>
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
          className={isOpen ? "block" : "hidden md:block"}
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
                      "h-auto w-full flex-row items-center justify-start py-3",
                      pathname === "/" && "bg-muted",
                    )}
                  >
                    <Home className="h-4 w-4" />

                    <div className="ml-4 flex flex-col items-start">
                      <div className="text-sm font-medium">Portal</div>
                      <div className="text-muted-foreground text-xs">
                        {mode === "detrans"
                          ? "Detrans AI Chat & Starter Questions"
                          : "GenderAffirming AI Chat"}
                      </div>
                    </div>
                  </Button>
                </Link>
                <Link href={"/compare"} onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-auto w-full flex-row items-center justify-start py-3",
                      pathname === "/compare" && "bg-muted",
                    )}
                  >
                    <ArrowLeftRight className="h-4 w-4" />

                    <div className="ml-4 flex flex-col items-start">
                      <div className="text-sm font-medium">Compare Sides</div>
                      <div className="text-muted-foreground text-xs">
                        Compare Trans & Detrans Perspectives
                      </div>
                    </div>
                  </Button>
                </Link>

                {/* Resources Section */}
                {mode === "detrans" && (
                  <div className="pt-2">
                    <div className="border-border rounded-lg border p-3">
                      <h3 className="text-muted-foreground mb-2 text-sm font-medium">
                        Resources
                      </h3>
                      <div className="space-y-1">
                        <Link
                          href={"/support"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/support" && "bg-muted",
                            )}
                          >
                            <Heart className="h-4 w-4" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                Get Support
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Find community and therapists
                              </div>
                            </div>
                          </Button>
                        </Link>
                        <Link
                          href={"/stories"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/stories" && "bg-muted",
                            )}
                          >
                            <Youtube className="h-4 w-4" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                Personal Stories
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Videos by people who have been through it
                              </div>
                            </div>
                          </Button>
                        </Link>
                        <Link
                          href={"/definitions"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/definitions" && "bg-muted",
                            )}
                          >
                            <FileText className="h-4 w-4" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                Definitions
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Key terms and concepts
                              </div>
                            </div>
                          </Button>
                        </Link>

                        <Link
                          href={"/studies"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/studies" && "bg-muted",
                            )}
                          >
                            <BookOpen className="h-4 w-4" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                Peer-reviewed Studies
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Relevant academic research
                              </div>
                            </div>
                          </Button>
                        </Link>
                        <a href="https://statsforgender.org/" target="_blank">
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-between py-3",
                            )}
                          >
                            <div className="flex flex-row items-center">
                              <ChartNoAxesCombined className="h-4 w-4" />
                              <div className="ml-4 flex flex-col items-start">
                                <div className="text-sm font-medium">
                                  Verified Statistics
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  statsforgender.org
                                </div>
                              </div>
                            </div>
                            <ExternalLink className="ml-2 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* About Section */}
                <div className="pt-2">
                  <div className="border-border rounded-lg border p-3">
                    <h3 className="text-muted-foreground mb-2 text-sm font-medium">
                      About
                    </h3>
                    <div className="space-y-1">
                      {mode !== "affirm" && false && (
                        <Link href={"/about"} onClick={() => setIsOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/about" && "bg-muted",
                            )}
                          >
                            <Scroll className="h-4 w-4" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">About</div>
                              <div className="text-muted-foreground text-xs">
                                Understand why I built this
                              </div>
                            </div>
                          </Button>
                        </Link>
                      )}
                      <Link
                        href={!devAffirm ? "/contact" : "/affirm/contact"}
                        onClick={() => setIsOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/contact" && "bg-muted",
                          )}
                        >
                          <Mail className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">Contact</div>
                            <div className="text-muted-foreground text-xs">
                              Get in touch with me
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link
                        href={!devAffirm ? "/prompts" : "/affirm/prompts"}
                        onClick={() => setIsOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/prompts" && "bg-muted",
                          )}
                        >
                          <Settings className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">
                              How It Works
                            </div>
                            <div className="text-muted-foreground text-xs">
                              View the AI system prompts
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link
                        href={!devAffirm ? "/terms" : "/affirm/terms"}
                        onClick={() => setIsOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/terms" && "bg-muted",
                          )}
                        >
                          <HelpCircle className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">Terms</div>
                            <div className="text-muted-foreground text-xs">
                              Privacy policy and terms
                            </div>
                          </div>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pb-16" onClick={() => setIsOpen(false)}>
                <DonationCard mode={mode} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
