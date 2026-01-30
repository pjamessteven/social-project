"use client";

import DonationCard from "@/app/components/content/DonationCard";
import { Link } from "@/i18n/routing";
import { clsx } from "clsx";
import {
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
  Users,
  X,
  Youtube,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { SettingsMenu } from "./SettingsMenu";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href}>
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "ms-2 rounded-full px-4 transition-all",
          isActive && "bg-accent",
        )}
      >
        {label}
      </Button>
    </Link>
  );
}

export default function Header({
  mode,
  locale,
}: {
  mode: "detrans" | "affirm";
  locale?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";
  const devAffirm = isDev && mode === "affirm";
  const t = useTranslations("header");
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
          <NavLink
            href={!devAffirm ? "/" : "/affirm"}
            label={t("navigation.home")}
          />

          <NavigationMenu className="ms-2">
            <NavigationMenuList>
              {/* Resources Menu */}
              {mode === "detrans" && (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="rounded-full bg-transparent px-4 text-sm font-medium">
                    {t("navigation.resources")}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-68 gap-1 p-1">
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/support"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <Heart className="me-2 h-6 w-6" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              {t("resources.genderSupport")}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              {t("resources.genderSupportDesc")}
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/definitions"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <FileText className="me-2 h-8 w-8" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              {t("resources.terminology")}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              {t("resources.terminologyDesc")}
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
                            <Users className="me-2 h-6 w-6" />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              {t("resources.stories")}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              {t("resources.storiesDesc")}
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/videos"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <div>
                            <Youtube className="me-2 h-6 w-6" />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              {t("resources.videos")}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              {t("resources.videosDesc")}
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/studies"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <BookOpen className="me-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              {t("resources.studies")}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              {t("resources.studiesDesc")}
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
                            <ChartNoAxesCombined className="me-5 mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("resources.statistics")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                                {t("resources.statisticsDesc")}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="ms-2 h-4" />
                        </a>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}
              {/* About Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="rounded-full bg-transparent px-4 text-sm font-medium">
                  {t("navigation.about")}
                </NavigationMenuTrigger>

                <NavigationMenuContent>
                  <div className="grid w-68 gap-1 p-1">
                    {mode !== "affirm" && false && (
                      <NavigationMenuLink asChild>
                        <Link
                          href={"/about"}
                          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                        >
                          <Scroll className="me-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm leading-none font-medium">
                              Manifesto
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
                        <Mail className="me-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            {t("about.contact")}
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            {t("about.contactDesc")}
                          </p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={"/prompts"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <Settings className="me-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            {t("about.systemPrompts")}
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            {t("about.systemPromptsDesc")}
                          </p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href={!devAffirm ? "/terms" : "/affirm/terms"}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground no-wrap flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                      >
                        <HelpCircle className="me-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div className="flex flex-col space-y-1">
                          <div className="text-sm leading-none font-medium">
                            {t("about.terms")}
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                            {t("about.termsDesc")}
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

        {/* Settings Menu */}
        <div
          className={clsx("mr-3", "hidden md:block")}
          onClick={(e) => e.stopPropagation()}
        >
          <SettingsMenu />
        </div>

        {/* Donate Button  */}
        <Link
          href="/donate"
          className={"hidden md:block"}
          onClick={(e) => e.stopPropagation()}
        >
          <Button size={"sm"} variant={"destructive"}>
            {t("donate")}
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
            <div className="flex h-full flex-col justify-between overflow-y-auto px-4 pb-4">
              {/* Mobile Header Actions Row */}
              <div className="border- sticky top-0 -mx-4 flex items-center justify-between gap-2 border-b bg-white px-4 pt-4 pb-4 shadow-md md:hidden dark:bg-black">
                <SettingsMenu />
                <Link href="/donate" onClick={() => setIsOpen(false)}>
                  <Button size="sm" variant="destructive">
                    {t("donate")}
                  </Button>
                </Link>
              </div>
              <div className="flex w-full flex-col space-y-2 pt-3">
                <Link href={"/"} onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-auto w-full flex-row items-center justify-start py-3",
                      pathname === "/" && "bg-muted",
                    )}
                  >
                    <Home className="h-4 w-4" />

                    <div className="ml-4 flex flex-col items-start">
                      <div className="text-sm font-medium">
                        {t("navigation.home")}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {mode === "detrans"
                          ? "Detrans AI Chat & Starter Questions"
                          : "GenderAffirming AI Chat"}
                      </div>
                    </div>
                  </Button>
                </Link>

                {/* Resources Section */}
                {mode === "detrans" && (
                  <div className="border-border border-t py-2">
                    <h3 className="text-muted-foreground ml-1 pt-2 text-sm font-medium">
                      {t("navigation.resources")}
                    </h3>
                    <div className="space-y-1">
                      <Link href="/support" onClick={() => setIsOpen(false)}>
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
                              {t("resources.genderSupport")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("resources.genderSupportDesc")}
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link href="/stories" onClick={() => setIsOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/stories" && "bg-muted",
                          )}
                        >
                          <Users className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">
                              {t("resources.stories")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("resources.storiesDesc")}
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link href="/videos" onClick={() => setIsOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/videos" && "bg-muted",
                          )}
                        >
                          <Youtube className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">
                              {t("resources.videos")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("resources.videosDesc")}
                            </div>
                          </div>
                        </Button>
                      </Link>
                      <Link
                        href="/definitions"
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
                              {t("resources.terminology")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("resources.terminologyDesc")}
                            </div>
                          </div>
                        </Button>
                      </Link>

                      <Link href="/studies" onClick={() => setIsOpen(false)}>
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
                              {t("resources.studies")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {t("resources.studiesDesc")}
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
                                {t("resources.statistics")}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {t("resources.statisticsDesc")}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="ms-2 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                )}

                {/* About Section */}

                <div className="border-border border-t py-2">
                  <h3 className="text-muted-foreground ml-1 pt-2 text-sm font-medium">
                    {t("navigation.about")}
                  </h3>
                  <div className="space-y-1">
                    {mode !== "affirm" && false && (
                      <Link href="/about" onClick={() => setIsOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-auto w-full flex-row items-center justify-start py-3",
                            pathname === "/about" && "bg-muted",
                          )}
                        >
                          <Scroll className="h-4 w-4" />
                          <div className="ml-4 flex flex-col items-start">
                            <div className="text-sm font-medium">Manifesto</div>
                            <div className="text-muted-foreground text-xs">
                              Understand why I built this
                            </div>
                          </div>
                        </Button>
                      </Link>
                    )}
                    <Link href="/contact" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-auto w-full flex-row items-center justify-start py-3",
                          pathname === "/contact" && "bg-muted",
                        )}
                      >
                        <Mail className="h-4 w-4" />
                        <div className="ml-4 flex flex-col items-start">
                          <div className="text-sm font-medium">
                            {t("about.contact")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("about.contactDesc")}
                          </div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/prompts" onClick={() => setIsOpen(false)}>
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
                            {t("about.systemPrompts")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("about.systemPromptsDesc")}
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
                          <div className="text-sm font-medium">
                            {t("about.terms")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("about.termsDesc")}
                          </div>
                        </div>
                      </Button>
                    </Link>
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
