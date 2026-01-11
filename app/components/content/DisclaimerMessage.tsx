export default function DisclaimerMessage() {
  return (
    <div className="max-w-screen">
      <div className="flex flex-col items-center justify-center gap-2 px-4 pb-4 sm:flex-row sm:items-center sm:px-0">
        <div className="text-muted-foreground text-left text-sm sm:text-center">
          I can make mistakes, I'm not a replacement for a real therapist!{" "}
          <br className="hidden sm:inline" /> Do not share any personal
          information that could be used to identify you.{" "}
        </div>
      </div>
    </div>
  );
}
