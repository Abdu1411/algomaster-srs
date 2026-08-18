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
      model: 'gemini-2.5-flash',
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
    You are AlgoMaster AI, an elite computer science professor, technical interview coach, and expert in the Dart programming language and data structures.
    
    The user has sent the following inquiry:
    "${inquiry}"
    
    ${context ? `Context provided:\n${context}\n` : ''}
    
    Instructions:
    1. Answer the inquiry thoroughly, clearly, and concisely.
    2. Whenever providing code examples, ALWAYS use modern, idiomatic Dart (null safety, typed collections like List<int>, Map<K,V>, Set<E>, Queue<T>, generics, etc.).
    3. Include time complexity (Big-O) and space complexity analysis where relevant.
    4. Format your answer using clean GitHub-flavored Markdown with headers, bullet points, and syntax highlighted dart code blocks (\`\`\`dart ... \`\`\`).
    5. Be practical, insightful, and focused on mastering algorithms and Dart patterns.
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
