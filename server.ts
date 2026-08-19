import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Health check endpoint for cloud load balancers and deployment verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extractTextFromUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove non-content elements
    $('script, style, nav, footer, iframe, img, svg, noscript, header').remove();
    
    // Extract main text or body
    const bodyText = $('article, main, .content, #content, body').text();
    return bodyText.replace(/\s+/g, ' ').trim().slice(0, 40000);
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Failed to fetch content from URL. Please check the URL or provide a topic title.');
  }
}

function safeParseJSONArray(rawText: string) {
  let text = (rawText || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  
  if (!text) {
    throw new Error('Gemini AI returned an empty response. Please try submitting your topic again.');
  }

  try {
    const res = JSON.parse(text);
    if (Array.isArray(res) && res.length > 0) return res;
  } catch (e) {
    // If output was truncated at token limit, recover all complete card objects
    const firstBracket = text.indexOf('[');
    const lastObjectEnd = text.lastIndexOf('}');
    if (firstBracket !== -1 && lastObjectEnd !== -1 && lastObjectEnd > firstBracket) {
      try {
        const candidate = text.substring(firstBracket, lastObjectEnd + 1) + ']';
        const res2 = JSON.parse(candidate);
        if (Array.isArray(res2) && res2.length > 0) return res2;
      } catch (err2) {
        // Fall through
      }
    }
    throw new Error(`Failed to parse AI flashcards: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  throw new Error('AI returned 0 flashcards. Please try a more specific topic.');
}

app.post('/api/generate-deck', async (req, res) => {
  try {
    const { url, topic } = req.body;
    let contextText = '';
    
    if (url) {
      contextText = await extractTextFromUrl(url);
    }

    const effectiveTopic = (topic && topic.trim()) 
      ? topic.trim() 
      : (url ? 'Algorithms & Data Structures from provided URL' : 'Dart Data Structures and Algorithms Mastery');

    const prompt = `
    You are an expert algorithm and data structures instructor specializing in the Dart programming language (Dart 3.x).
    Your mission is to read and analyze the provided topic and/or content from a web document / article URL and convert it into a comprehensive deck of Anki-style spaced repetition flashcards.
    
    CRITICAL UNIVERSAL CONVERSION RULE - 100% DART CODE:
    - Regardless of what programming language or format the original article or link is written in (whether Python, C++, Java, JavaScript, Go, Rust, pseudocode, or plain English):
      YOU MUST CONVERT AND TRANSLATE ALL CODE, IMPLEMENTATIONS, EXAMPLES, DATA STRUCTURES, AND SNIPPETS 100% INTO CLEAN, IDIOMATIC, MODERN DART 3.x (with sound null safety, strong typing like List<T>, Map<K,V>, Set<E>, Queue<T>, classes, extension methods, and Dart collection literals).
    - NEVER produce Python, JavaScript, Java, C++, or any language other than Dart.
    
    Topic: ${effectiveTopic}
    Extracted Web / Article Content:
    ${contextText ? contextText.slice(0, 25000) : 'No external URL provided. Generate cards based on topic name.'}
    
    TASK:
    Analyze all the algorithms, patterns, complexities, logic, and techniques in this content, and synthesize a rich deck of 15 to 25 high-yield flashcards covering:
    1. Concept / "Why" (Understand the core idea in Dart context)
    2. Complexity (Time/space Big-O analysis)
    3. Pattern trigger (Recognize when to apply this in Dart / Flutter applications)
    4. Cloze deletion (Remember key steps using Anki {{c1::...}} syntax)
    5. Comparison (Distinguish similar data structures/algorithms in Dart)
    6. Trace / visual (Simulate step-by-step on small Dart data input)
    7. Invariant / proof (Why the algorithm maintains correctness)
    8. Debugging (Common Dart implementation pitfalls and edge cases)
    9. Implementation prompt (Dart coding prompts - e.g. "Implement function \`int binarySearch(List<int> list, int target)\` in Dart")
    
    Format requirements:
    Return a JSON array of objects.
    Each object must have:
    - id: a unique string (e.g. "dart-1", "dart-2")
    - type: one of ["Concept", "Complexity", "Pattern", "Cloze", "Comparison", "Trace", "Invariant", "Debugging", "Implementation"]
    - front: front of card in Markdown with Dart code blocks (\`\`\`dart ... \`\`\`)
    - back: back of card with thorough answer in Markdown with Dart code blocks (\`\`\`dart ... \`\`\`)
    - codeSnippet: (optional) Dart code snippet for Debugging or Trace cards
    
    Ensure the output is ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { 
                type: Type.STRING, 
                enum: ["Concept", "Complexity", "Pattern", "Cloze", "Comparison", "Trace", "Invariant", "Debugging", "Implementation"] 
              },
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              codeSnippet: { type: Type.STRING, nullable: true }
            },
            required: ["id", "type", "front", "back"]
          }
        }
      }
    });

    let text = response.text || '';
    if (!text && response.candidates && response.candidates[0]?.content?.parts) {
      text = response.candidates[0].content.parts.map((p: any) => p.text || '').join('');
    }

    const parsedCards = safeParseJSONArray(text);
    res.json(parsedCards);
  } catch (error: any) {
    console.error('Generate Deck Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
});

app.post('/api/evaluate-code', async (req, res) => {
  try {
    const { prompt, code, language = 'dart' } = req.body;
    
    const evaluationPrompt = `
    You are an expert technical interviewer and computer science professor specializing in Dart algorithms.
    A student has submitted a Dart implementation for the following prompt:
    
    Prompt: ${prompt}
    
    Student's Dart Code:
    \`\`\`dart
    ${code}
    \`\`\`
    
    Evaluate the Dart code for algorithmic correctness, time/space complexity, and idiomatic Dart practices (null-safety, clean types).
    Grade the submission honestly using one of these three grades:
    - "Again" - Needs a hint, syntax broke, or got the core logic wrong.
    - "Good" - Wrote it correctly in Dart, maybe with minor suboptimal nuances.
    - "Easy" - Wrote it flawlessly, optimally, and idiomatically in Dart.
    
    Return a JSON object with:
    - grade: "Again", "Good", or "Easy"
    - feedback: A short paragraph of constructive feedback in markdown format.
    
    Ensure the output is ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: evaluationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING, enum: ["Again", "Good", "Easy"] },
            feedback: { type: Type.STRING }
          },
          required: ["grade", "feedback"]
        }
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Evaluate Code Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ask-ai', async (req, res) => {
  try {
    const { inquiry, context } = req.body;
    if (!inquiry || !inquiry.trim()) {
      return res.status(400).json({ error: 'Inquiry prompt is required.' });
    }

    const prompt = `
    You are AlgoMaster AI, an elite computer science professor, principal engineer, and master tutor in algorithms, data structures, and the Dart language.
    
    USER'S INQUIRY:
    "${inquiry}"
    
    ${context ? `
    =======================================================
    CURRENT RESOURCE CONTEXT (WHAT THE USER IS CURRENTLY VIEWING):
    =======================================================
    ${context}
    =======================================================
    IMPORTANT CONTEXT INSTRUCTION:
    The user is currently viewing the resource detailed above (e.g. a specific SRS flashcard question, lecture notes, code editor workspace, or study session).
    If the user's question is asking to explain, simplify, optimize, quiz, debug, compare, or elaborate on what they are currently viewing, directly reference and deeply analyze this active context.
    ` : ''}
    
    RESPONSE GUIDELINES:
    1. Answer authoritatively, clearly, and concisely with deep technical depth.
    2. Whenever providing code examples, ALWAYS use modern, idiomatic Dart (null safety, generics, Typed collections, pattern matching, records).
    3. Include exact time complexity (Big-O) and space complexity analysis formatted in LaTeX ($O(1)$, $O(N \\log N)$, $O(V + E)$).
    4. Format with clean GitHub-Flavored Markdown (GFM), including subheadings, code blocks (\`\`\`dart ... \`\`\`), and callout quotes.
    5. If the user asks for a quiz or code challenge on their currently viewed material, generate an active recall question with hidden or progressive hints.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    const answer = response.text || 'No response generated.';
    res.json({ answer });
  } catch (error: any) {
    console.error('Ask AI Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process inquiry with AI' });
  }
});

app.post('/api/format-card-archetype', async (req, res) => {
  try {
    const { question, answer, targetType } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    const archetype = targetType || 'Concept';

    const prompt = `
    You are an expert spaced repetition system (SRS) instructional designer and Dart algorithm coach.
    
    Convert the following AI inquiry & answer into an optimized, high-yield SRS flashcard of archetype: "${archetype}".
    
    ORIGINAL INQUIRY:
    "${question}"
    
    ORIGINAL AI ANSWER:
    "${answer}"
    
    TARGET ARCHETYPE:
    "${archetype}"
    
    ARCHETYPE REQUIREMENTS:
    - Concept: "Why" & core intuition. Front poses an active recall question. Back provides concise, authoritative explanation.
    - Complexity: Big-O analysis. Front asks for time/space complexity and worst-case bounds. Back gives exact Big-O and mathematical proof ($O(N)$, $O(\\log N)$).
    - Pattern: Recognition of algorithmic patterns (Two Pointers, Monotonic Queue, Sliding Window, Bit Manipulation, etc.).
    - Cloze: Fill-in-the-blank active recall using [___] for the key formula, invariant, or method call.
    - Comparison: Structured head-to-head comparison highlighting time/space trade-offs between two approaches.
    - Trace: Step-by-step state simulation or recursion tree trace.
    - Invariant: Loop or structural invariants that guarantee correctness.
    - Debugging: A subtle bug trap, edge case, or Dart null-safety pitfall with correction.
    - Implementation: A coding challenge in modern idiomatic Dart with starter signature and test assertions.
    
    OUTPUT SCHEMA:
    Return a JSON object with:
    - type: "${archetype}"
    - front: Refined front prompt for active recall (Markdown).
    - back: Refined back explanation for active recall (Markdown).
    - codeSnippet: (Optional) Dart code snippet if applicable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            codeSnippet: { type: Type.STRING }
          },
          required: ["type", "front", "back"]
        }
      }
    });

    let text = response.text || '{}';
    if (text.trim().startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const cardData = JSON.parse(text);
    res.json({
      type: archetype,
      front: cardData.front || question,
      back: cardData.back || answer,
      codeSnippet: cardData.codeSnippet || undefined
    });
  } catch (error: any) {
    console.error('Format Card Archetype Error:', error);
    res.status(500).json({ error: error.message || 'Failed to convert to card archetype' });
  }
});

app.post('/api/generate-lesson', async (req, res) => {
  try {
    const { url, urls, rawText, topic } = req.body;
    
    // Normalize source list
    const sourceList: string[] = [];
    if (Array.isArray(urls)) {
      urls.forEach((u: string) => {
        if (u && typeof u === 'string' && u.trim()) sourceList.push(u.trim());
      });
    } else if (typeof urls === 'string' && urls.trim()) {
      urls.split(/[\n,]+/).forEach((u: string) => {
        if (u.trim()) sourceList.push(u.trim());
      });
    }
    if (url && typeof url === 'string' && url.trim() && !sourceList.includes(url.trim())) {
      sourceList.unshift(url.trim());
    }

    let combinedContext = '';
    const validSourcesUsed: string[] = [];

    // Fetch all URLs in parallel
    if (sourceList.length > 0) {
      const fetchResults = await Promise.allSettled(
        sourceList.map(async (srcUrl) => {
          const text = await extractTextFromUrl(srcUrl);
          return { url: srcUrl, text };
        })
      );

      fetchResults.forEach((resItem, idx) => {
        const targetUrl = sourceList[idx];
        if (resItem.status === 'fulfilled' && resItem.value.text) {
          validSourcesUsed.push(targetUrl);
          combinedContext += `\n\n=== SOURCE [${idx + 1}]: ${targetUrl} ===\n${resItem.value.text.slice(0, 15000)}\n`;
        } else {
          console.warn(`Could not extract from URL: ${targetUrl}`);
        }
      });
    }

    // Add pasted raw text / transcripts if provided
    if (rawText && typeof rawText === 'string' && rawText.trim()) {
      combinedContext += `\n\n=== SOURCE [Pasted Transcript / Supplementary Notes]: ===\n${rawText.trim().slice(0, 20000)}\n`;
      validSourcesUsed.push('Pasted Text / Lecture Notes');
    }

    const effectiveTopic = (topic && topic.trim()) 
      ? topic.trim() 
      : (sourceList.length > 0 ? 'Computer Science Multi-Source Lecture Note' : 'Advanced Data Structures & Algorithms');

    const prompt = `
    You are an elite computer science professor and senior software engineer creating definitive lecture notes from multiple multimedia sources.
    
    MISSION:
    Synthesize comprehensive, structured study lecture notes from all the computer science sources provided below (multiple articles, documentation, repository references, and lecture notes).
    Merge the best explanations, architectural diagrams, algorithms, and practical considerations into one master study document.
    Format these as a professor or senior engineer would prepare notes for students, with clear organization, logical progression, and a balance between theory and implementation.
    
    CONTENT REQUIREMENTS:
    1. Core Concepts & Architecture: Extract and thoroughly explain all key computer science concepts, data structures, algorithms, design patterns, and architectural principles across the provided sources.
    2. Code & Implementation: Provide clean, well-commented, and idiomatic Dart (and polyglot where helpful) code snippets to demonstrate how concepts work in practice.
    3. Efficiency Analysis: Always analyze the time and space complexity of algorithms and data structures using Big-O notation ($O(N)$, $O(\\log N)$, $O(1)$, etc.).
    4. Terminology: Define all specialized jargon (e.g., idempotency, concurrency, cache invalidation, cache line locality, branch prediction) clearly.
    5. Systems & Trade-offs: Connect software choices to foundational hardware principles (memory hierarchy, CPU cache, heap vs stack allocation) and discuss engineering trade-offs (e.g., time vs. space, consistency vs. availability).
    
    FORMATTING GUIDELINES:
    - Use appropriate markdown headings (# Title, ## Section, ### Subsections) to create a logical hierarchical structure.
    - Format all mathematical expressions, complexity bounds, and boolean logic using LaTeX (enclosed in $ or $$ delimiters, e.g. $O(N \\log N)$).
    - Present important theoretical points as concise, complete sentences rather than endless shallow bullet points.
    - Use explicit markdown code blocks with language identifiers (e.g. \`\`\`dart) for all code snippets.
    - Bold or italicize key technical terms when first introduced.
    - Include text-based Mermaid.js diagrams (\`\`\`mermaid ... \`\`\`) whenever a concept benefits from visual representation (flowcharts, pointer layouts, tree structures, state transitions).
    
    EDUCATIONAL APPROACH:
    - Deconstruction: Break complex systems or algorithms into digestible components (e.g., explain the base case and recurrence relation before showing the complete solution).
    - Practical Application: Provide illuminating, real-world engineering examples (e.g. database indexing, network routing, garbage collection).
    - Insight Boxes: Include "Deep Dive" and "Common Pitfall" callout blocks (e.g. \`> **Deep Dive:** ...\` or \`> **⚠️ Common Pitfall:** ...\`) highlighting edge cases and bug traps.
    
    TOPIC:
    ${effectiveTopic}
    
    COMBINED SOURCE CONTENTS (${validSourcesUsed.length} Sources Provided):
    ${combinedContext ? combinedContext.slice(0, 35000) : 'Generate comprehensive lecture notes based on the topic.'}
    
    OUTPUT:
    Return a JSON object with:
    - title: A concise, authoritative title for the lecture note (e.g. "Lecture 04: Self-Balancing Red-Black Trees & Cache Locality")
    - topic: The primary subject category
    - content: The complete, exhaustive lecture notes in rich Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            topic: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "topic", "content"]
        }
      }
    });

    let text = response.text || '{}';
    if (text.trim().startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const data = JSON.parse(text);
    res.json({
      ...data,
      sources: validSourcesUsed.length > 0 ? validSourcesUsed : (sourceList.length > 0 ? sourceList : undefined),
      sourceUrl: validSourcesUsed[0] || sourceList[0] || undefined
    });
  } catch (error: any) {
    console.error('Generate Lesson Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate CS lecture notes' });
  }
});

async function startServer() {
  if (isProd) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
