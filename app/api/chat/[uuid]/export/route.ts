import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper function to escape RTF special characters and encode Unicode
function escapeRtf(text: string): string {
  // First, escape RTF control characters
  let escaped = text
    .replace(/\\/g, "\\\\") // Backslash
    .replace(/{/g, "\\{") // Opening brace
    .replace(/}/g, "\\}") // Closing brace
    .replace(/\n/g, "\\par\n") // New line
    .replace(/\t/g, "\\tab ") // Tab
    .replace(/\r/g, ""); // Carriage return
  
  // Convert to RTF Unicode escape sequences for non-ASCII characters
  // RTF uses \uN? for Unicode characters, where N is the Unicode code point in decimal
  // and ? is the replacement character for older readers (we'll use '?' as placeholder)
  // We'll encode characters above 127 (non-ASCII)
  let result = "";
  for (let i = 0; i < escaped.length; i++) {
    const char = escaped[i];
    const code = char.charCodeAt(0);
    if (code <= 127) {
      result += char;
    } else {
      // RTF Unicode escape: \uN?
      // Note: The ? is a placeholder character for old RTF readers
      result += `\\u${code}?`;
    }
  }
  return result;
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
      // For lines that don't start with RTF commands, we need to ensure they're properly escaped
      // But escapeRtf already handles all characters, so we can just use it
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

    // Start RTF document with proper Unicode support
    // Use \ansicpg65001 for UTF-8, but not all readers support it
    // Instead, use \ansicpg1252 and rely on \u escapes for Unicode
    // \uc1 indicates we're using Unicode escapes (1 byte per character?)
    // Actually, \uc1 means we support Unicode with the \uN? syntax
    let rtfContent = "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Arial;}}\n";
    rtfContent += "\\viewkind4\\uc1\\pard\\f0\\fs24\\lang1033\n";

    // Add header - make sure to escape the date and time strings
    rtfContent += "\\b Conversation with detrans.ai\\b0\\par\n";
    rtfContent += `\\i Exported on ${escapeRtf(dateStr)} at ${escapeRtf(timeStr)}\\i0\\par\\par\n`;

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
