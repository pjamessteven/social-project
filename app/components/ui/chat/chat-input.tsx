"use client";

import { ChatInput, useChatUI, useFile } from "@llamaindex/chat-ui";
import { DocumentInfo, ImagePreview } from "@llamaindex/chat-ui/widgets";
import { getConfig } from "../lib/utils";
import { LlamaCloudSelector } from "./custom/llama-cloud-selector";

export default function CustomChatInput() {
  const { requestData, isLoading, input } = useChatUI();
  const uploadAPI = getConfig("UPLOAD_API") ?? "";
  const llamaCloudAPI =
    getConfig("LLAMA_CLOUD_API") ??
    (process.env.NEXT_PUBLIC_SHOW_LLAMACLOUD_SELECTOR === "true"
      ? "/api/chat/config/llamacloud"
      : "");
  const {
    uploadFile,
    files,
    removeDoc,
    reset,
  } = useFile({ uploadAPI });

  /**
   * Handles file uploads. Overwrite to hook into the file upload behavior.
   * @param file The file to upload
   */
  const handleUploadFile = async (file: File) => {
    // There's already an image uploaded, only allow one image at a time

    try {
      // Upload the file and send with it the current request data
      await uploadFile(file, requestData);
    } catch (error: unknown) {
      // Show error message if upload fails
      alert(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  };

  // Get references to the upload files in message annotations format, see https://github.com/run-llama/chat-ui/blob/main/packages/chat-ui/src/hook/use-file.tsx#L56

  return (
    <ChatInput resetUploadedFiles={reset} >
      <ChatInput.Form>
        <ChatInput.Field />
        <ChatInput.Submit
          disabled={
            isLoading 
          }
        />
      </ChatInput.Form>
    </ChatInput>
  );
}
