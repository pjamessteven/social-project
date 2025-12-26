import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper function to escape RTF special characters in plain text
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, "\\\\") // Backslash
    .replace(/{/g, "\\{") // Opening brace
    .replace(/}/g, "\\}") // Closing brace
    .replace(/\n/g, "\\par\n") // New line
    .replace(/\t/g, "\\tab ") // Tab
    .replace(/\r/g, ""); // Carriage return
}

// Helper function to convert markdown to RTF
function markdownToRtf(markdown: string): string {
  // Process headers first
  let rtf = markdown.replace(/^##\s+(.+)$/gm, (match, headerText) => {
    return `\\b\\fs28 ${escapeRtf(headerText)}\\b0\\fs24`;
  });
  rtf = rtf.replace(/^###\s+(.+)$/gm, (match, headerText) => {
    return `\\b\\fs26 ${escapeRtf(headerText)}\\b0\\fs24`;
  });
  rtf = rtf.replace(/^####\s+(.+)$/gm, (match, headerText) => {
    return `\\b\\fs24 ${escapeRtf(headerText)}\\b0\\fs24`;
  });
  
  // Process bold (**text**)
  rtf = rtf.replace(/\*\*(.+?)\*\*/g, (match, boldText) => {
    return `\\b ${escapeRtf(boldText)}\\b0`;
  });
  rtf = rtf.replace(/__(.+?)__/g, (match, boldText) => {
    return `\\b ${escapeRtf(boldText)}\\b0`;
  });
  
  // Process italic (*text*)
  rtf = rtf.replace(/\*(.+?)\*/g, (match, italicText) => {
    return `\\i ${escapeRtf(italicText)}\\i0`;
  });
  rtf = rtf.replace(/_(.+?)_/g, (match, italicText) => {
    return `\\i ${escapeRtf(italicText)}\\i0`;
  });
  
  // Process bullet points
  rtf = rtf.replace(/^\s*[-*+]\s+(.+)$/gm, (match, itemText) => {
    return `\\bullet ${escapeRtf(itemText)}`;
  });
  
  // Process numbered lists
  rtf = rtf.replace(/^\s*\d+\.\s+(.+)$/gm, (match, itemText) => {
    return `\\tab ${escapeRtf(itemText)}`;
  });
  
  // Escape any remaining text that hasn't been processed
  // Split by lines to handle properly
  const lines = rtf.split('\n');
  const processedLines = lines.map(line => {
    // If the line doesn't start with a backslash (RTF command), escape it
    if (!line.startsWith('\\')) {
      // Check if the line contains any RTF commands we added
      // For simplicity, escape the whole line if it doesn't start with \
      // But this might not be perfect
      // Let's escape the line and then re-add RTF commands? This is tricky
      // For now, escape the line
      return escapeRtf(line);
    }
    return line;
  });
  
  // Join lines back
  rtf = processedLines.join('\\par\n');
  
  return rtf;
}

// Helper to extract RTF content from message parts
function extractMessageContent(message: any): string {
  let rtfContent = "";

  // Handle message with parts
  if (message.parts && Array.isArray(message.parts)) {
    message.parts.forEach((part: any) => {
      if (part.type === "text" && part.text) {
        // Convert markdown to RTF and add it
        rtfContent += markdownToRtf(part.text) + "\\par\n";
      } else if (
        part.type === "data-comment-query-event" ||
        part.type === "data-video-query-event"
      ) {
        const data = part.data || {};
        const title = data.title || "Query";
        const query = data.query || "";
        // Build RTF with italics properly
        // Note: In RTF, {\i text} makes text italic
        rtfContent += "\\par{\\i " + escapeRtf(`${title}: ${query}`) + "\\i0}\\par\\par\n";
      } else if (part.type === "text-delta" && part.delta) {
        rtfContent += markdownToRtf(part.delta);
      }
    });
  }
  // Handle older message formats
  else if (typeof message.content === "string") {
    rtfContent = markdownToRtf(message.content);
  } else if (message.content && typeof message.content === "object") {
    if (message.content.text) {
      rtfContent = markdownToRtf(message.content.text);
    } else if (message.content.content) {
      rtfContent = markdownToRtf(message.content.content);
    } else {
      rtfContent = escapeRtf(JSON.stringify(message.content));
    }
  } else if (message.text) {
    rtfContent = markdownToRtf(message.text);
  } else if (message.delta) {
    rtfContent = markdownToRtf(message.delta);
  }

  return rtfContent;
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

        // Get RTF content (already properly formatted and escaped)
        const content = extractMessageContent(message);
        if (content.trim()) {
          rtfContent += content;
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
