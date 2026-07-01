"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { cn, uuidv4 } from "@/app/lib/utils";
import { Link } from "@/i18n/routing";
import { useChatUI } from "@llamaindex/chat-ui";
import { Download, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ChatActionBar({
  conversationId,
  className,
}: {
  conversationId?: string;
  className?: string;
}) {
  const { messages, stop } = useChatUI();
  const router = useRouter();
  const hasMessages = messages.length > 0;

  const [portalHref, setPortalHref] = useState("/");
  useEffect(() => {
    const storedTab = sessionStorage.getItem("portalTab");
    if (storedTab && storedTab !== "featured") {
      setPortalHref(`/?tab=${storedTab}`);
    } else {
      setPortalHref("/");
    }
  }, []);

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "rtf">("pdf");

  const newConversation = () => {
    if (stop) stop();
    router.replace(`/chat/${uuidv4()}`);
  };

  const handleDownload = () => {
    if (!conversationId) return;
    setIsDownloadDialogOpen(false);
    if (selectedFormat === "pdf") {
      window.open(`/api/chat/${conversationId}/export-pdf`, "_blank");
    } else {
      window.open(`/api/chat/${conversationId}/export-rtf`, "_blank");
    }
  };

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed right-0 bottom-[88px] left-0 z-50 flex justify-center bg-gradient-to-t from-white via-white/80 to-transparent px-4 py-4 pt-16 sm:bottom-[96px] dark:from-black dark:via-black/80",
          className,
        )}
      >
        <div className="flex w-3xl items-center justify-between py-2 sm:px-4">
          <Link
            href={portalHref as "/"}
            className="pointer-events-auto cursor-pointer font-semibold no-underline"
          >
            <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-start text-sm opacity-90 transition-colors sm:text-base">
              <div className="mr-2 whitespace-nowrap no-underline">{"<-"}</div>
              <div className="hidden hover:underline sm:block">
                {"Back to Portal"}
              </div>
              <div className="hover:underline sm:hidden">{"Back"}</div>
            </div>
          </Link>
          <div className="pointer-events-auto flex items-center gap-4">
            {hasMessages && (
              <div
                onClick={() => setIsDownloadDialogOpen(true)}
                className="cursor-pointer border-r pr-2 font-semibold hover:underline"
              >
                <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                  <Download className="h-4 w-4" />
                </div>
              </div>
            )}
            <div
              onClick={newConversation}
              className="cursor-pointer font-semibold hover:underline"
            >
              <div className="text-muted-primary hover:text-primary no-wrap flex cursor-pointer flex-row items-center text-sm opacity-90 transition-colors sm:text-base">
                <div className="mr-2 whitespace-nowrap">
                  <RefreshCcw className="h-4 w-4" />
                </div>
                <div className="hover:underline">{"New Conversation"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isDownloadDialogOpen}
        onOpenChange={setIsDownloadDialogOpen}
      >
        <DialogContent className="min-w-80 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose File Format</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) =>
                setSelectedFormat(value as "pdf" | "rtf")
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rtf" id="rtf" />
                <Label htmlFor="rtf" className="cursor-pointer">
                  RTF (Rich Text Format)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDownloadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleDownload}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
