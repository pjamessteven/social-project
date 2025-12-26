import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper function to escape RTF special characters
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, "\\\\")       // Backslash
    .replace(/{/g, "\\{")         // Opening brace
    .replace(/}/g, "\\}")         // Closing brace
    .replace(/\n/g, "\\par\n")    // New line
    .replace(/\t/g, "\\tab ")     // Tab
    .replace(/\r/g, "");          // Carriage return
}

// Helper to extract text content from message parts
function extractMessageContent(message: any): string {
  let content = "";
  
  // Handle message with parts
  if (message.parts && Array.isArray(message.parts)) {
    message.parts.forEach((part: any) => {
      if (part.type === "text" && part.text) {
        content += part.text + "\n";
      } else if (
        part.type === "data-comment-query-event" ||
        part.type === "data-video-query-event"
      ) {
        const data = part.data || {};
        const title = data.title || "Query";
        const query = data.query || "";
        content += `${title}: ${query}\n`;
      } else if (part.type === "text-delta" && part.delta) {
        content += part.delta;
      }
    });
  } 
  // Handle older message formats
  else if (typeof message.content === "string") {
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
  } else if (message.delta) {
    content = message.delta;
  }
  
  return content;
}

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
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    // Start RTF document
    let rtfContent = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\n";
    rtfContent += "\\viewkind4\\uc1\\pard\\f0\\fs24\n";
    
    // Add header
    rtfContent += "\\b Conversation with detrans.ai\\b0\\par\n";
    rtfContent += `\\i Exported on ${dateStr} at ${timeStr}\\i0\\par\\par\n`;

    // Process each message
    if (Array.isArray(messages)) {
      for (const message of messages) {
        const role = message.role === "user" ? "User" : "detrans.ai";
        
        // Add role in bold
        rtfContent += `\\b ${role}:\\b0\\par\n`;
        
        // Get and escape content
        const content = extractMessageContent(message);
        if (content.trim()) {
          const escapedContent = escapeRtf(content);
          rtfContent += escapedContent + "\\par\n";
        } else {
          rtfContent += "[No text content]\\par\n";
        }
        
        // Add spacing between messages
        rtfContent += "\\par\n";
      }
    } else {
      rtfContent += "\\i No messages found in conversation\\i0\\par\\par\n";
    }

    // Close RTF document
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
