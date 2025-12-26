import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required" },
        { status: 400 },
      );
    }

    // Retrieve the conversation from the database
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.uuid, uuid))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const chatData = conversation[0];

    // Parse the messages JSON
    let messages;
    try {
      messages = JSON.parse(chatData.messages);
    } catch (error) {
      console.error("Failed to parse messages JSON:", error);
      return NextResponse.json(
        { error: "Invalid conversation data" },
        { status: 500 },
      );
    }

    // Generate RTF content
    const now = new Date();
    let rtfContent = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\n";
    rtfContent += "\\viewkind4\\uc1\\pard\\f0\\fs24\n"; // Default font size 12pt

    // Add header
    rtfContent += `\\b Conversation with detrans.ai}\\b0\\par\n`;
    rtfContent += `\\i Exported on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\\i0\\par\\par\n`;

    // Process each message
    if (Array.isArray(messages)) {
      messages.forEach((message: any) => {
        const role = message.role === "user" ? "User" : "detrans.ai";

        // Format role in bold
        rtfContent += `\\b ${role}:\\b0\\par `;

        // Check if message has parts
        if (message.parts && Array.isArray(message.parts)) {
          // Process each part
          message.parts.forEach((part: any) => {
            if (part.type === "text") {
              // Handle text parts
              const textContent = part.text || "";
              const escapedContent = textContent
                .replace(/\\/g, "\\\\")
                .replace(/{/g, "\\{")
                .replace(/}/g, "\\}")
                .replace(/\n/g, "\\par ");
              rtfContent += escapedContent + "\\par ";
            } else if (
              part.type === "data-comment-query-event" ||
              part.type === "data-video-query-event"
            ) {
              // Handle data query events - only include title and query
              const data = part.data || {};
              const title = data.title || "Query";
              const query = data.query || "";

              // Format the query event
              rtfContent += `\\i ${title}:\\i0 ${query}\\par `;
            } else {
              // For other part types, include a placeholder
              rtfContent += `\\i [${part.type} content]\\i0\\par `;
            }
          });
        } else {
          // Fallback for older message format
          let content = "";
          if (typeof message.content === "string") {
            content = message.content;
          } else if (message.content && typeof message.content === "object") {
            if (message.content.text) {
              content = message.content.text;
            } else if (message.content.content) {
              content = message.content.content;
            } else {
              content = JSON.stringify(message.content);
            }
          } else if (message.text) {
            content = message.text;
          }

          const escapedContent = content
            .replace(/\\/g, "\\\\")
            .replace(/{/g, "\\{")
            .replace(/}/g, "\\}")
            .replace(/\n/g, "\\par ");
          rtfContent += escapedContent + "\\par ";
        }

        rtfContent += "\\par\n";
      });
    } else {
      rtfContent += "\\i No messages found in conversation\\i0\\par\\par\n";
    }

    rtfContent += "}";

    // Create response with RTF headers
    const filename = `detrans-conversation-${uuid}-${now.toISOString().split("T")[0]}.rtf`;

    return new NextResponse(rtfContent, {
      status: 200,
      headers: {
        "Content-Type": "application/rtf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
