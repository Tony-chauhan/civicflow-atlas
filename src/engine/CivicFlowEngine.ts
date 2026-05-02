export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export interface AppState {
  jurisdiction: { country: string; state: string };
  userType: string;
  goalMode: string;
  progress: string;
}

const SYSTEM_PROMPT = `You are CivicFlow Atlas, a neutral civic-education assistant that helps users understand election processes.
You are currently helping a user in India.
1. NEVER endorse candidates or parties. If asked who to vote for, provide a neutral evaluation framework.
2. Return your response formatted in simple HTML (using tags like <p>, <ul>, <li>, <strong>, <br>). Do not use markdown.
3. Every response MUST include these exact sections if applicable:
   - The main answer/plan
   - A section starting with "<p class='text-red-400 text-sm mt-3'>⚠️ <strong>Common mistake:</strong>"
   - A section starting with "<p class='text-slate-200'><strong>Next Best Action:</strong>"
4. If the user is doing a quiz or simulation, ask them the question and wait for their reply. If they reply A, B, or C, tell them if they are correct.
Be concise, clear, and highly actionable.`;

// The fallback simulation logic in case they don't have an API key
function getFallbackResponse(query: string, state: AppState): string {
    const q = query.toLowerCase();
    const locContext = state.jurisdiction.state ? ` (${state.jurisdiction.state}, India)` : ' (India)';

    if (q === 'a' || q === 'b' || q === 'c') {
        return `
            <p class="mb-4"><strong>Answer:</strong> (Simulated) In a real AI mode, I would evaluate your answer "${query.toUpperCase()}".</p>
            <p class="text-red-400 text-sm mb-3">⚠️ <strong>Common mistake:</strong> Guessing answers without reading the electoral rules.</p>
            <p class="text-slate-200"><strong>Next Best Action:</strong> Provide an API key in the sidebar for true interactive AI quizzes!</p>
        `;
    }

    if (q.includes('who should i vote') || q.includes('who to vote') || q.includes('endorse')) {
        return `
            <p class="mb-4"><strong>Answer:</strong> I am a neutral guide, so I cannot advise you on who to vote for or endorse any candidates.</p>
            <div class="bg-slate-800/40 p-4 rounded-xl border-l-4 border-blue-500 mb-4">
                <h4 class="text-blue-400 font-semibold mb-2">Neutral Evaluation Framework</h4>
                <ul class="list-disc pl-5 space-y-2 text-sm text-slate-300">
                    <li><strong>Issues Checklist:</strong> Identify top 3 personal priorities.</li>
                    <li><strong>Source Quality:</strong> Read official party manifestos.</li>
                    <li><strong>Compare Claims:</strong> Use non-partisan fact-checking sites.</li>
                </ul>
            </div>
            <p class="text-red-400 text-sm mb-3">⚠️ <strong>Common mistake:</strong> Relying on unverified social media forwards.</p>
            <p class="text-slate-200"><strong>Next Best Action:</strong> Write down your top 3 issues on paper.</p>
        `;
    }

    if (q.includes('quiz') || q.includes('test')) {
        return `
            <p class="mb-4 font-semibold text-lg text-white">Knowledge Quiz Mode</p>
            <div class="bg-slate-800/40 p-4 rounded-xl border border-slate-700 mb-4">
                <h4 class="text-purple-400 font-semibold">Question 1</h4>
                <p class="text-sm text-slate-300 leading-relaxed mt-2">You arrive at the polling station, but you forgot your EPIC (Voter ID) card at home. You do have your physical Aadhaar Card. Your name is confirmed to be on the electoral roll. Can you vote?</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-200">
                    <li><strong>A)</strong> Yes, Aadhaar is valid</li>
                    <li><strong>B)</strong> No, only Voter ID works</li>
                </ul>
            </div>
            <p class="text-red-400 text-sm mb-3">⚠️ <strong>Common mistake:</strong> Not checking the electoral roll.</p>
            <p class="text-slate-200"><strong>Next Best Action:</strong> Type 'A' or 'B' in the chat to answer!</p>
        `;
    }

    if (q.includes('document') || q.includes('checklist')) {
        return `
            <p class="mb-4 font-semibold text-lg text-white">Document Checklist Builder${locContext}</p>
            <div class="space-y-4 mb-5">
                <div class="bg-red-950/20 p-4 rounded-xl border-l-4 border-red-500">
                    <h4 class="text-red-400 font-semibold mb-2">📋 Must-Have (Bring ONE of these)</h4>
                    <ul class="list-disc pl-5 space-y-1 text-sm text-slate-300">
                        <li>EPIC (Voter ID Card)</li>
                        <li>Aadhaar Card, PAN Card, Passport, or Driving License</li>
                    </ul>
                </div>
            </div>
            <p class="text-red-400 text-sm mb-3">⚠️ <strong>Common mistake:</strong> Showing up with a digital copy of your ID on your phone.</p>
            <p class="text-slate-200"><strong>Next Best Action:</strong> Physically locate your chosen ID right now.</p>
        `;
    }

    return `
        <p class="mb-4"><strong>Answer:</strong> I am CivicFlow Atlas. (Simulated Mode - No API Key provided).</p>
        <p class="text-slate-300 text-sm">Please add a free Gemini API key or OpenAI API key in the sidebar to enable true interactive AI chatting, dynamic quizzes, and customized timelines!</p>
        <p class="text-red-400 text-sm mt-4 mb-3">⚠️ <strong>Common mistake:</strong> Expecting full AI conversation without an API key.</p>
        <p class="text-slate-200"><strong>Next Best Action:</strong> Add your API key in the bottom left.</p>
    `;
}

export async function generateV2Response(messages: ChatMessage[], state: AppState, apiKey: string): Promise<string> {
    const latestQuery = messages[messages.length - 1].content;
    
    // Fallback if no API key is provided
    if (!apiKey || apiKey.trim() === '') {
        return getFallbackResponse(latestQuery, state);
    }

    try {
        // OpenAI API Format
        if (apiKey.startsWith('sk-')) {
            const apiMessages = [
                { role: 'system', content: SYSTEM_PROMPT + `\nUser is in: ${state.jurisdiction.state}, India.` }
            ];
            
            messages.forEach(m => {
                // remove HTML from previous assistant messages for clean history
                const cleanContent = m.content.replace(/<[^>]*>?/gm, '');
                apiMessages.push({ role: m.role, content: cleanContent });
            });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: apiMessages,
                    temperature: 0.3
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        } 
        // Gemini API Format
        else if (apiKey.startsWith('AIza')) {
            const contents = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content.replace(/<[^>]*>?/gm, '') }]
            }));

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: SYSTEM_PROMPT + `\nUser is in: ${state.jurisdiction.state}, India.` }]
                    },
                    contents: contents,
                    generationConfig: { temperature: 0.3 }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;
        } else {
            return `<p class="text-red-400">Invalid API Key format. Must start with 'sk-' (OpenAI) or 'AIza' (Gemini).</p>`;
        }
    } catch (err: any) {
        return `<p class="text-red-400">API Error: ${err.message}</p><p>Check your API key or connection.</p>`;
    }
}
