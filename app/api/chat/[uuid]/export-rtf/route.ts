import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper function to escape RTF special characters and encode Unicode
function escapeRtf(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // Handle RTF special characters
    if (char === "\\") {
      result += "\\\\";
    } else if (char === "{") {
      result += "\\{";
    } else if (char === "}") {
      result += "\\}";
    } else if (char === "\n") {
      result += "\\par\n";
    } else if (char === "\t") {
      result += "\\tab ";
    } else if (char === "\r") {
      // Skip carriage returns
    } else if (code <= 127) {
      result += char;
    } else {
      // RTF Unicode escape: \uN? where N is decimal code point
      result += `\\u${code}?`;
    }
  }
  return result;
}

// Helper function to convert markdown to RTF
function markdownToRtf(markdown: string): string {
  // Process line by line to handle block-level elements
  const lines = markdown.split("\n");
  const processedLines: string[] = [];

  for (const line of lines) {
    // Check for headers first (before escaping)
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);
    const h4Match = line.match(/^####\s+(.+)$/);
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

    if (h2Match) {
      const headerText = processInlineFormatting(h2Match[1]);
      processedLines.push(`{\\b\\fs28 ${headerText}}{\\b0\\fs24 }`);
    } else if (h3Match) {
      const headerText = processInlineFormatting(h3Match[1]);
      processedLines.push(`{\\b\\fs26 ${headerText}}{\\b0\\fs24 }`);
    } else if (h4Match) {
      const headerText = processInlineFormatting(h4Match[1]);
      processedLines.push(`{\\b\\fs24 ${headerText}}{\\b0\\fs24 }`);
    } else if (bulletMatch) {
      const itemText = processInlineFormatting(bulletMatch[1]);
      // Use proper RTF bullet: \bullet followed by tab
      processedLines.push(`{\\pntext\\bullet\\tab}${itemText}`);
    } else if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = processInlineFormatting(numberedMatch[2]);
      processedLines.push(`{\\pntext ${escapeRtf(num)}.\\tab}${itemText}`);
    } else {
      // Regular line - process inline formatting
      processedLines.push(processInlineFormatting(line));
    }
  }

  return processedLines.join("\\par\n");
}

// Process inline formatting (bold, italic) within a line
function processInlineFormatting(text: string): string {
  // We need to handle markdown inline formatting while escaping RTF special chars
  // Strategy: find markdown patterns, replace with placeholders, escape, then restore

  const placeholders: { placeholder: string; rtf: string }[] = [];
  let placeholderIndex = 0;

  // Process bold first (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, (match, content) => {
    const placeholder = `\x00BOLD${placeholderIndex++}\x00`;
    placeholders.push({ placeholder, rtf: `{\\b ${escapeRtf(content)}}` });
    return placeholder;
  });
  text = text.replace(/__(.+?)__/g, (match, content) => {
    const placeholder = `\x00BOLD${placeholderIndex++}\x00`;
    placeholders.push({ placeholder, rtf: `{\\b ${escapeRtf(content)}}` });
    return placeholder;
  });

  // Process italic (*text* or _text_) - but not if it's part of a word
  text = text.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, (match, content) => {
    const placeholder = `\x00ITALIC${placeholderIndex++}\x00`;
    placeholders.push({ placeholder, rtf: `{\\i ${escapeRtf(content)}}` });
    return placeholder;
  });
  text = text.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, (match, content) => {
    const placeholder = `\x00ITALIC${placeholderIndex++}\x00`;
    placeholders.push({ placeholder, rtf: `{\\i ${escapeRtf(content)}}` });
    return placeholder;
  });

  // Now escape the remaining text
  let result = escapeRtf(text);

  // Restore placeholders with RTF formatting
  // The placeholders themselves got escaped, so we need to handle that
  for (const { placeholder, rtf } of placeholders) {
    // The null bytes would have been preserved since they're ASCII
    result = result.replace(placeholder, rtf);
  }

  return result;
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
        // Build RTF with italics properly using groups
        rtfContent +=
          "\\par{\\i " + escapeRtf(`${title}: ${query}`) + "}\\par\\par\n";
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
    // \ansicpg1252 for Windows-1252 codepage, \uc1 for Unicode support
    let rtfContent =
      "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Arial;}}\n";
    rtfContent += "\\viewkind4\\uc1\\pard\\f0\\fs24\\lang1033\n";

    // Add header
    rtfContent += "{\\b Conversation with detrans.ai}\\par\n";
    rtfContent += `{\\i Exported on ${escapeRtf(dateStr)} at ${escapeRtf(timeStr)}}\\par\\par\n`;

    // Process each message
    if (Array.isArray(messages)) {
      for (const message of messages) {
        const role = message.role === "user" ? "User" : "detrans.ai";

        // Add role in bold using group
        rtfContent += `{\\b ${escapeRtf(role)}:}\\par\n`;

        // Get RTF content (already properly formatted and escaped)
        const content = extractMessageContent(message);
        if (content.trim()) {
          rtfContent += content;
        } else {
          rtfContent += "{\\i [No text content]}\\par\n";
        }

        // Add spacing between messages
        rtfContent += "\\par\n";
      }
    } else {
      rtfContent += "{\\i No messages found in conversation}\\par\\par\n";
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
