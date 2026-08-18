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
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts and styles
    $('script, style, nav, footer, iframe, img, svg').remove();
    
    return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 50000); // Limit to prevent massive prompts
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Failed to fetch content from URL');
  }
}

app.post('/api/generate-deck', async (req, res) => {
  try {
    const { url, topic } = req.body;
    let contextText = '';
    
    if (url) {
      contextText = await extractTextFromUrl(url);
    }

    const prompt = `
    You are an expert algorithm and data structures instructor specializing in the Dart programming language.
    Your task is to generate Anki-style flashcards based on the provided topic and/or content.
    The cards should follow best spaced repetition practices.
    
    CRITICAL RULE - PROGRAMMING LANGUAGE:
    ALL CODE SNIPPETS, CODE BLOCKS, DEBUGGING EXAMPLES, AND IMPLEMENTATION PROMPTS MUST BE EXCLUSIVELY WRITTEN IN DART (modern Dart with null safety, strong types like List<int>, Map<K, V>, Set<E>, Queue<T>, class, extension methods, etc.).
    DO NOT use Python, JavaScript, Java, C++, or any language other than Dart.
    
    Topic: ${topic || 'Dart Algorithms and Data Structures'}
    Content context (if any): ${contextText.slice(0, 20000)}
    
    Create exactly 30 high-quality flashcards covering the topic thoroughly and in depth. YOU MUST INCLUDE MULTIPLE CARDS OF EACH OF THE FOLLOWING 9 TYPES in your output:
    1. Concept / "Why" (Understand the core idea in Dart context)
    2. Complexity (Time/space complexity)
    3. Pattern trigger (Recognize when to use it in Dart/Flutter apps)
    4. Cloze deletion (Remember key steps). IMPORTANT: The front MUST use standard Anki cloze syntax, like: "The time complexity is {{c1::O(N)}}". Do not use blank underscores.
    5. Comparison (Distinguish similar algorithms in Dart)
    6. Trace / visual (Simulate on small Dart data input)
    7. Invariant / proof (Know why it works)
    8. Debugging (Learn common Dart implementation mistakes)
    9. Implementation prompt (Schedule actual Dart coding - e.g. "Implement function \`int binarySearch(List<int> sortedList, int target)\` in Dart")
    
    Distribute the 30 cards across these 9 types evenly to build a comprehensive mastery deck.
    
    Return a JSON array of objects.
    Each object must have:
    - id: a unique string
    - type: one of ["Concept", "Complexity", "Pattern", "Cloze", "Comparison", "Trace", "Invariant", "Debugging", "Implementation"]
    - front: the front side of the card (question/prompt, in markdown with dart code blocks \`\`\`dart)
    - back: the back side of the card (answer, in markdown with dart code blocks \`\`\`dart)
    - codeSnippet: (optional) a Dart code snippet to display on the front for Debugging or Trace cards.
    
    Ensure the output is ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
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

    let text = response.text || '[]';
    
    // Sometimes the model wraps JSON in markdown blocks even with responseMimeType
    if (text.trim().startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    res.json(JSON.parse(text));
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
