import { forwardRef } from "react";

const FullWidthPage = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(function FullWidthPage({ children, ...props }, ref) {
  return (
    <div
      ref={ref}
      {...props}
      className="fixed top-0 left-0 z-0 mt-[56px] h-[calc(100vh-64px)] w-full snap-x snap-mandatory overflow-x-auto overflow-y-scroll md:w-full"
    >
      {children}
    </div>
  );
});

FullWidthPage.displayName = "FullWidthPage";

export default FullWidthPage;
