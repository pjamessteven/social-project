import { NextRequest, NextResponse } from "next/server";
import { chatConversations, db } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID parameter is required" },
        { status: 400 }
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
        { status: 404 }
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
        { status: 500 }
      );
    }

    // Generate RTF content
    const now = new Date();
    let rtfContent = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\n";
    rtfContent += "\\viewkind4\\uc1\\pard\\f0\\fs24\n"; // Default font size 12pt

    // Add header
    rtfContent += `\\b Conversation Export - ${chatData.title || "Untitled Conversation"}\\b0\\par\n`;
    rtfContent += `\\i Exported on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\\i0\\par\\par\n`;

    // Process each message
    if (Array.isArray(messages)) {
      messages.forEach((message: any) => {
        // Handle different message structures
        const role = message.role === "user" ? "User" : "detrans.ai";
        // Get content - it could be in different fields
        let content = "";
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (message.content && typeof message.content === 'object') {
          // Handle if content is an object with text or other properties
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
        
        // Format role in bold
        rtfContent += `\\b ${role}:\\b0\\par `;
        
        // Escape RTF special characters and handle line breaks
        const escapedContent = content
          .replace(/\\/g, "\\\\")
          .replace(/{/g, "\\{")
          .replace(/}/g, "\\}")
          .replace(/\n/g, "\\par ");
        
        rtfContent += escapedContent + "\\par\\par\n";
      });
    } else {
      rtfContent += "\\i No messages found in conversation\\i0\\par\\par\n";
    }

    rtfContent += "}";

    // Create response with RTF headers
    const filename = `detrans-conversation-${uuid}-${now.toISOString().split('T')[0]}.rtf`;
    
    return new NextResponse(rtfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rtf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Failed to export conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
