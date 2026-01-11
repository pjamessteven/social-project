import { chatConversations, db } from "@/db";
import ReactPDF, {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import React from "react";

// Register fonts if needed (optional)
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' });

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 12,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  messageContainer: {
    marginBottom: 20,
  },
  role: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  content: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 1.6,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 5,
  },
  bulletPoint: {
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
  },
  codeBlock: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 4,
    fontFamily: "Courier",
    fontSize: 10,
    marginVertical: 5,
  },
  inlineCode: {
    backgroundColor: "#f5f5f5",
    fontFamily: "Courier",
    fontSize: 10,
    paddingHorizontal: 4,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
});

// Helper to extract plain text from message parts
function extractPlainText(message: any): string {
  let textContent = "";

  if (message.parts && Array.isArray(message.parts)) {
    message.parts.forEach((part: any) => {
      if (part.type === "text" && part.text) {
        textContent += part.text + "\n";
      } else if (
        part.type === "data-comment-query-event" ||
        part.type === "data-video-query-event"
      ) {
        const data = part.data || {};
        const title = data.title || "Query";
        const query = data.query || "";
        textContent += `${title}: ${query}\n\n`;
      } else if (part.type === "text-delta" && part.delta) {
        textContent += part.delta;
      }
    });
  } else if (typeof message.content === "string") {
    textContent = message.content;
  } else if (message.content && typeof message.content === "object") {
    if (message.content.text) {
      textContent = message.content.text;
    } else if (message.content.content) {
      textContent = message.content.content;
    } else {
      textContent = JSON.stringify(message.content);
    }
  } else if (message.text) {
    textContent = message.text;
  } else if (message.delta) {
    textContent = message.delta;
  }

  return textContent;
}

// Helper to parse markdown and convert to PDF elements
function parseMarkdownToElements(text: string): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for headers
    if (line.startsWith("## ")) {
      elements.push(
        <Text
          key={i}
          style={{ fontSize: 18, fontWeight: "bold", marginVertical: 5 }}
        >
          {line.substring(3)}
        </Text>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <Text
          key={i}
          style={{ fontSize: 16, fontWeight: "bold", marginVertical: 4 }}
        >
          {line.substring(4)}
        </Text>,
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <Text
          key={i}
          style={{ fontSize: 14, fontWeight: "bold", marginVertical: 3 }}
        >
          {line.substring(5)}
        </Text>,
      );
    }
    // Check for bullet points
    else if (line.match(/^\s*[-*+]\s/)) {
      const bulletText = line.replace(/^\s*[-*+]\s+/, "");
      elements.push(
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            {parseInlineMarkdown(bulletText)}
          </Text>
        </View>,
      );
    }
    // Check for numbered lists
    else if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)/);
      if (match) {
        const [, num, bulletText] = match;
        elements.push(
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletPoint}>{num}.</Text>
            <Text style={styles.bulletText}>
              {parseInlineMarkdown(bulletText)}
            </Text>
          </View>,
        );
      }
    }
    // Check for code blocks (simplified)
    else if (line.trim().startsWith("```")) {
      // Skip the code block delimiter
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <Text key={`code-${i}`} style={styles.codeBlock}>
          {codeLines.join("\n")}
        </Text>,
      );
    }
    // Regular paragraph
    else if (line.trim()) {
      elements.push(
        <Text key={i} style={styles.content}>
          {parseInlineMarkdown(line)}
        </Text>,
      );
    } else {
      // Empty line
      elements.push(
        <Text key={i} style={{ marginBottom: 10 }}>
          {"\n"}
        </Text>,
      );
    }
  }

  return elements;
}

// Helper to parse inline markdown (bold, italic, code)
function parseInlineMarkdown(text: string): React.ReactElement | string {
  // Simple parsing for bold and italic
  const parts: (string | React.ReactElement)[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // Check for bold **text**
    if (text.substring(i, i + 2) === "**") {
      if (currentText) {
        parts.push(currentText);
        currentText = "";
      }
      const endIndex = text.indexOf("**", i + 2);
      if (endIndex !== -1) {
        const boldText = text.substring(i + 2, endIndex);
        parts.push(
          <Text key={i} style={styles.bold}>
            {boldText}
          </Text>,
        );
        i = endIndex + 2;
        continue;
      }
    }
    // Check for italic *text*
    else if (
      text[i] === "*" &&
      (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") &&
      i + 1 < text.length &&
      text[i + 1] !== "*"
    ) {
      const endIndex = text.indexOf("*", i + 1);
      if (
        endIndex !== -1 &&
        (endIndex === text.length - 1 ||
          text[endIndex + 1] === " " ||
          text[endIndex + 1] === "\n")
      ) {
        if (currentText) {
          parts.push(currentText);
          currentText = "";
        }
        const italicText = text.substring(i + 1, endIndex);
        parts.push(
          <Text key={i} style={styles.italic}>
            {italicText}
          </Text>,
        );
        i = endIndex + 1;
        continue;
      }
    }
    // Check for inline code `code`
    else if (text[i] === "`") {
      const endIndex = text.indexOf("`", i + 1);
      if (endIndex !== -1) {
        if (currentText) {
          parts.push(currentText);
          currentText = "";
        }
        const codeText = text.substring(i + 1, endIndex);
        parts.push(
          <Text key={i} style={styles.inlineCode}>
            {codeText}
          </Text>,
        );
        i = endIndex + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    parts.push(currentText);
  }

  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0] as string;
  }

  return <Text>{parts}</Text>;
}

// Create PDF Document component
function ConversationPDF({
  messages,
  dateStr,
  timeStr,
}: {
  messages: any[];
  dateStr: string;
  timeStr: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversation with detrans.ai</Text>
          <Text style={styles.subtitle}>
            Exported on {dateStr} at {timeStr}
          </Text>
        </View>

        {messages.map((message, index) => {
          const role = message.role === "user" ? "User" : "detrans.ai";
          const content = extractPlainText(message);

          return (
            <View key={index} style={styles.messageContainer} wrap={false}>
              <Text style={styles.role}>{role}:</Text>
              <View style={styles.content}>
                {parseMarkdownToElements(content)}
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );
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

    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      messages = [];
    }

    // Generate date strings
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // Create PDF
    const pdfDoc = (
      <ConversationPDF
        messages={messages}
        dateStr={dateStr}
        timeStr={timeStr}
      />
    );

    // Generate PDF as a buffer
    const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);

    // Create response with PDF headers
    const filename = `detrans-conversation-${uuid}-${now.toISOString().split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to export conversation as PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
