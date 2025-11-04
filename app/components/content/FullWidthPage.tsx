export default function FullWidthPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed top-0 left-0 z-0 mt-[56px] h-[calc(100vh-64px)] w-full snap-x snap-mandatory overflow-x-auto overflow-y-scroll md:w-full"></div>
  );
}
