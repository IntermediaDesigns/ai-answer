import { Groq } from "groq-sdk";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { Client, Databases } from "node-appwrite";

interface Message {
  role: "user" | "ai";
  content: string;
  sources?: string[];
}

// Initialize clients
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize Appwrite
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
  .setProject(process.env.APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || "";

// Extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Scrape content from a URL using Cheerio for static content
async function scrapeWithCheerio(url: string): Promise<string> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script tags, style tags, and comments
  $("script").remove();
  $("style").remove();
  $("comment").remove();

  // Get text content from body
  return $("body").text().trim().replace(/\s+/g, " ");
}

// Scrape content from a URL using Puppeteer for dynamic content
async function scrapeWithPuppeteer(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    // Wait for body element to be available
    await page.waitForSelector("body");

    // Get text content from body
    const content = await page.$eval("body", el => el.innerText);
    return content.trim().replace(/\s+/g, " ");
  } finally {
    await browser.close();
  }
}

// Get content from URLs using both Cheerio and Puppeteer
async function getUrlsContent(
  urls: string[]
): Promise<{ url: string; content: string }[]> {
  const results = [];

  for (const url of urls) {
    try {
      // Try Cheerio first for better performance
      let content = await scrapeWithCheerio(url);

      // If content is too short, try Puppeteer for dynamic content
      if (content.length < 100) {
        content = await scrapeWithPuppeteer(url);
      }

      // Truncate content if too long
      if (content.length > 8000) {
        content = content.slice(0, 8000) + "...";
      }

      results.push({ url, content });
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  return results;
}

// GET handler for retrieving conversation history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Get conversation document from Appwrite
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        id
      );
      const messages = document.messages ? JSON.parse(document.messages) : [];
      return Response.json({ messages });
    } catch {
      // If document not found, return empty array
      return Response.json({ messages: [] });
    }
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return Response.json(
      { error: "Failed to retrieve conversation" },
      { status: 500 }
    );
  }
}

// POST handler for processing messages and storing conversation history
export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    if (!conversationId) {
      return Response.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Get existing conversation history
    let existingMessages: Message[] = [];
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        conversationId
      );
      if (document.messages) {
        existingMessages = JSON.parse(document.messages);
      }
    } catch {
      // If document not found, we'll create it with the new message
      console.log("Creating new conversation");
    }

    // Add user message to history
    const userMessage: Message = { role: "user", content: message };
    existingMessages.push(userMessage);

    // Extract URLs from message
    const urls = extractUrls(message);

    // Get content from URLs
    const urlsContent = await getUrlsContent(urls);

    // Prepare context from scraped content
    const context = urlsContent
      .map(({ url, content }) => `Content from ${url}:\n${content}`)
      .join("\n\n");

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that answers questions based on provided context.
          Always cite sources when using information from the context.
          If the context doesn't contain relevant information, say so.
          Format source citations as [Source: URL].`,
        },
        {
          role: "user",
          content: context
            ? `Context:\n${context}\n\nQuestion: ${message}`
            : message,
        },
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Prepare AI response
    const aiResponse: Message = {
      role: "ai",
      content:
        completion.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response.",
      sources: urlsContent.map(({ url }) => url),
    };

    // Add AI response to history
    existingMessages.push(aiResponse);

    // Store updated conversation history
    try {
      try {
        // Try to update existing document
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          conversationId,
          {
            messages: JSON.stringify(existingMessages),
          }
        );
      } catch {
        // If document doesn't exist, create it
        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          conversationId,
          {
            messages: JSON.stringify(existingMessages),
          }
        );
      }
    } catch (error) {
      console.error("Error storing conversation:", error);
      throw error;
    }

    return Response.json(aiResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
