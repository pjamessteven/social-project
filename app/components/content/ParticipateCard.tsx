import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ParticipateCard() {
  return (
    <Link prefetch={false} href={"/participate"} className="no-underline">
      <div className="group row relative mt-8 flex cursor-pointer items-center justify-between overflow-hidden rounded-xl border border-[#77b255]/40 bg-[#77b255]/20 px-3 py-3 text-[#315b17] transition-all duration-500 hover:brightness-110 sm:px-4 sm:py-3 dark:border-[#315b17]/30 dark:bg-[#315b17]/30 dark:text-lime-50">
        {/* shimmer overlay */}
        <div className="dark:[#315b17]/30 pointer-events-none absolute inset-0 left-0 w-[300%] translate-x-[-100%] bg-gradient-to-r from-white/20 via-white/10 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-[0%] dark:via-white/10"></div>{" "}
        <div className="z-10 flex flex-col">
          <div className="text-sm font-semibold brightness-80 sm:text-base">
            Are you a detransitioner or a desister?
          </div>
          <div className="mt-1 text-xs opacity-80 sm:text-sm dark:opacity-50">
            Participate in international studies to help improve scientific
            understanding of transgender identities
            <span className="hidden sm:inline">
              , to improve outcomes for people experiencing gender dysphoria,
              and to win cash prizes!
            </span>
          </div>
        </div>
        <ChevronRight className="z-10 ml-3 h-4 min-w-4 text-[#3e721d] dark:text-white/40 dark:opacity-80" />
      </div>
    </Link>
  );
}
