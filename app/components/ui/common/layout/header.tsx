"use client";

import DonationCard from "@/app/components/content/DonationCard";
import { Link, usePathname } from "@/i18n/routing";
import { useMainStore } from "@/stores/main-store";
import { useUserStore } from "@/stores/user-store";
import { clsx } from "clsx";
import {
  BookOpen,
  BookText,
  ChartNoAxesCombined,
  DollarSign,
  ExternalLink,
  FileText,
  Heart,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Menu,
  MessageCircleHeart,
  Settings,
  X,
  Youtube,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { SlidingNavGroup, TabDef } from "../../sliding-nav-group";
import { SettingsMenu } from "./SettingsMenu";

// User menu component - shows email and logout when logged in
function UserMenu() {
  const { user, isAuthenticated, logout } = useUserStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLogout}
      className="rounded-full border px-3 py-1.5 text-sm md:mr-3"
    >
      <LogOut className="mr-2 h-4 w-4 md:mr-2" />
      <span className="max-w-[120px] truncate">Logout</span>
    </Button>
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
  const tHome = useTranslations("home");
  const { scrollPosition } = useMainStore();
  const { isAuthenticated } = useUserStore();

  const isChatActive =
    pathname === "/" || pathname === "/affirm" || pathname.startsWith("/chat");

  const baseTabs: TabDef[] = [
    {
      key: "chat",
      href: !devAffirm ? "/" : "/affirm",
      label: t("navigation.chat"),
      isActive: isChatActive,
      icon: <MessageCircleHeart className="h-3.5 w-3.5" />,
    },
  ];

  const detransTabs: TabDef[] =
    mode === "detrans"
      ? [
          {
            key: "videos",
            href: "/videos",
            label: t("navigation.videos"),
            isActive: pathname === "/videos",
            icon: <Youtube className="h-3.5 w-3.5" />,
          },
          {
            key: "studies",
            href: "/studies",
            label: t("navigation.studies"),
            isActive: pathname === "/studies",
            icon: <BookText className="h-3.5 w-3.5" />,
          },
          {
            key: "stats",
            href: "/stats",
            label: t("navigation.stats"),
            isActive: pathname === "/stats",
            icon: <ChartNoAxesCombined className="h-3.5 w-3.5" />,
          },
        ]
      : [];

  const allTabs = [...baseTabs, ...detransTabs];

  return (
    <div className="relative top-0 right-0 left-0 z-50 flex items-center bg-transparent p-2 px-4 shadow-none transition-all">
      {/* Shadow and border overlay that fades in/out on scroll */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full shadow transition-opacity duration-300 dark:border-b",
          scrollPosition > 1 ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Left side: Logo - takes equal space to balance center */}
      <div className="flex flex-1 items-center gap-2">
        <Link
          href={isDev && mode === "affirm" ? "/affirm" : "/"}
          className="!cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <MessageCircleHeart className="size-6" />
            <h1 className="font-semibold">{"detrans.ai"}&nbsp;</h1>
          </div>
        </Link>
      </div>

      {/* Center: Desktop Navigation with jelly sliding background */}
      <div className="hidden flex-shrink-0 items-center md:flex">
        <SlidingNavGroup
          pillClassName="shadow-[0px_0px_0px_1px_rgba(14,63,126,0.06),0px_1px_1px_-0.5px_rgba(42,51,70,0.03),0px_2px_2px_-1px_rgba(42,51,70,0.04),0px_3px_3px_-1.5px_rgba(42,51,70,0.04),0px_5px_5px_-2.5px_rgba(42,51,70,0.03),0px_10px_10px_-5px_rgba(42,51,70,0.03),0px_24px_24px_-8px_rgba(42,51,70,0.03)] dark:bg-secondary "
          className=""
          tabClassName=""
          tabs={allTabs}
          moreDropdown={
            mode === "detrans" ? (
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="-ml-1 flex items-center gap-1 rounded-full !bg-transparent px-4 py-1 text-sm font-medium hover:bg-transparent">
                      <Info className="mr-1 h-4 w-4" />
                      {t("navigation.about")}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="">
                      <div className="grid w-72 gap-1 p-2">
                        {/* Support Section */}
                        <div className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-semibold tracking-wider uppercase">
                          {t("navigation.support")}
                        </div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/support"
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <Heart className="h-5 w-5 text-red-500" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("navigation.support")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                                {t("resources.genderSupportDesc")}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>

                        {/* Divider */}
                        <div className="bg-border my-1 h-px" />

                        {/* About Section */}
                        <div className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-semibold tracking-wider uppercase">
                          {t("navigation.about")}
                        </div>
                        <NavigationMenuLink asChild>
                          <Link
                            href={!devAffirm ? "/contact" : "/affirm/contact"}
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <Mail className="h-5 w-5" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("about.contact")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                                {t("about.contactDesc")}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/prompts"
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <Settings className="h-5 w-5" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("about.systemPrompts")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                                {t("about.systemPromptsDesc")}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link
                            href={!devAffirm ? "/terms" : "/affirm/terms"}
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <HelpCircle className="h-5 w-5" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("about.terms")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                                {t("about.termsDesc")}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/donate"
                            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-row items-center gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <DollarSign className="h-5 w-5" />
                            <div className="flex flex-col space-y-1">
                              <div className="text-sm leading-none font-medium">
                                {t("donate")}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                                {tHome("donate.card.button")}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            ) : undefined
          }
        />
      </div>

      {/* Right side: Actions - takes equal space to balance center */}
      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Settings Menu */}
        <div
          className={clsx("mr-2", "hidden md:block")}
          onClick={(e) => e.stopPropagation()}
        >
          <SettingsMenu />
        </div>

        {/* User Menu - Desktop only */}
        <div className="hidden md:block">
          <UserMenu />
        </div>

        {/* Donate Button  */}
        {!isAuthenticated && (
          <Link
            href="/donate"
            className={"hidden md:block"}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size={"sm"} variant={"destructive"}>
              {t("donate")}
            </Button>
          </Link>
        )}

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
                <div className="mr-r row flex">
                  <SettingsMenu />
                  <div className="ml-2">
                    <UserMenu />
                  </div>
                </div>
                <Link href="/donate" onClick={() => setIsOpen(false)}>
                  <Button size="sm" variant="destructive">
                    {t("donate")}
                  </Button>
                </Link>
              </div>

              <div className="flex w-full flex-col space-y-2 pt-3">
                {/* Chat */}
                <Link
                  href={!devAffirm ? "/" : "/affirm"}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-auto w-full flex-row items-center justify-start py-2",
                      isChatActive && "bg-muted",
                    )}
                  >
                    <MessageCircleHeart className="h-4 w-4" />
                    <div className="ml-4 flex flex-col items-start">
                      <div className="text-sm font-medium">
                        {t("navigation.chat")}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {mode === "detrans"
                          ? "Detrans AI Chat & Starter Questions"
                          : "GenderAffirming AI Chat"}
                      </div>
                    </div>
                  </Button>
                </Link>

                {/* Videos, Wiki, Studies, Support */}
                {mode === "detrans" && (
                  <>
                    <Link href="/videos" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-auto w-full flex-row items-center justify-start py-2",
                          pathname === "/videos" && "bg-muted",
                        )}
                      >
                        <Youtube className="h-4 w-4" />
                        <div className="ml-4 flex flex-col items-start">
                          <div className="text-sm font-medium">
                            {t("navigation.videos")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("resources.videosDesc")}
                          </div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/studies" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-auto w-full flex-row items-center justify-start py-2",
                          pathname === "/studies" && "bg-muted",
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        <div className="ml-4 flex flex-col items-start">
                          <div className="text-sm font-medium">
                            {t("navigation.studies")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("resources.studiesDesc")}
                          </div>
                        </div>
                      </Button>
                    </Link>
                    <Link href="/stats" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-auto w-full flex-row items-center justify-start py-2",
                          pathname === "/stats" && "bg-muted",
                        )}
                      >
                        <ChartNoAxesCombined className="h-4 w-4" />
                        <div className="ml-4 flex flex-col items-start">
                          <div className="text-sm font-medium">
                            {t("navigation.stats")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {t("navigation.statsDesc")}
                          </div>
                        </div>
                      </Button>
                    </Link>
                    {/* More / Resources Section */}
                    <div className="border-border mt-2 border-t py-2">
                      <h3 className="text-muted-foreground ml-1 pt-2 text-sm font-medium">
                        {t("navigation.resources")}
                      </h3>
                      <div className="space-y-1">
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

                    {/* Support Section */}
                    <div className="border-border border-t py-2">
                      <h3 className="text-muted-foreground ml-1 pt-2 text-sm font-medium">
                        {t("navigation.support")}
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
                            <Heart className="h-4 w-4 text-red-500" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                {t("navigation.support")}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {t("resources.genderSupportDesc")}
                              </div>
                            </div>
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* About Section */}
                    <div className="border-border border-t py-2">
                      <h3 className="text-muted-foreground ml-1 pt-2 text-sm font-medium">
                        {t("navigation.about")}
                      </h3>
                      <div className="space-y-1">
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
                        <Link href="/donate" onClick={() => setIsOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "h-auto w-full flex-row items-center justify-start py-3",
                              pathname === "/donate" && "bg-muted",
                            )}
                          >
                            <Heart className="h-4 w-4 text-red-500" />
                            <div className="ml-4 flex flex-col items-start">
                              <div className="text-sm font-medium">
                                {t("donate")}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {tHome("donate.card.button")}
                              </div>
                            </div>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
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
