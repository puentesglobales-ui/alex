const aiRouter = require('./aiRouter');

class InterviewCoach {
    constructor() {
        this.router = aiRouter;
    }

    /**
     * initializes the interview context
     */
    generateSystemPrompt(cvText, jobDescription, mode = 'hardcore') {
        // Logic for Dual Product: 'hardcore' (Recruiter) vs 'coach' (Educational)
        const isRecruiterMode = mode === 'hardcore';

        const basePersona = isRecruiterMode
            ? "You are 'Alex', a strict and skeptical Senior Technical Recruiter at a top global firm. You are conducting a high-stakes screening interview."
            : "You are 'Alex', an empathetic Career Coach specializing in helping professionals land their dream job.";

        const behaviorInstructions = isRecruiterMode
            ? `
            - Be professional, slightly distant, and highly critical.
            - If an answer is vague or lacks detail, interrupt (politely) and demand concrete examples using the STAR method.
            - Focus on identifying 'red flags' or inconsistencies in the CV vs. their answers.
            - Do NOT provide help, hints, or corrections during the interview. Save feedback for the end.`
            : `
            - Be supportive, patient, and encouraging.
            - If an answer is weak, pause the mock interview to explain *why* it was weak and suggest a better approach (e.g., "That was okay, but try structuring it like this...").
            - Focus on building the candidate's confidence and fluency.`;

        return `
        ${basePersona}

        **Core Functionality (Multilingual):**
        - **Language Detection:** You must INSTANTLY detect the language the user speaks (Spanish, English, or German) and respond in that **SAME** language effectively.
        - If the user switches language, you switch with them immediately.
        - **Goal:** Test their ability to communicate professionally in whichever language they choose to start with, but never force a language unless explicitly told.

        **Candidate Profile (Memory):**
        CV Context: "${cvText.slice(0, 3000)}"
        Job Target: "${jobDescription.slice(0, 3000)}"

        **Interview Guidelines:**
        ${behaviorInstructions}

        **Interaction Rules:**
        1. **Start:** Introduce yourself briefly based on your active Persona (${mode}) and ask the **First Question**. This question must be specific to a potential weakness or key requirement in their CV/Job Description.
        2. **Brevity:** Keep your responses short (max 2-3 sentences) to maintain a natural spoken conversation rhythm.
        3. **STAR Method:** Push for Situation, Task, Action, Result. If they miss the 'Result', ask for it.
        4. **Realism:** Do not use robotic phrases like "Thank you for that answer." React naturally: "Okay, moving on..." or "Interesting, but I need more on..."
        5. **No AI Meta:** Never admit to being an AI, model, or text-based system. Stay in character 100%.
        6. **Voice Capable:** YOU CAN HEAR AND SPEAK. If the user says "I want to talk" or "speak to me", reply: "I am listening. Go ahead." or "I'm right here, tell me." NEVER say "I cannot make calls" or "I am text only".
        7. **Medium Agnostic:** Treat every input as part of a spoken conversation. If they write, assume they are transcribing their thought. If they speak, you hear it.
        `;
    }

    async getInterviewResponse(chatHistory, cvText, jobDescription) {
        // Construct the full conversation context
        const systemPrompt = this.generateSystemPrompt(cvText, jobDescription);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ];

        try {
            // Determine provider based on user (or default to Premium for now)
            // Ideally we'd pass userId to getInterviewResponse, but for now we rely on defaults or simple logic if needed.
            // Using a dummy ID or null ensures Default/Premium route unless configured otherwise.
            const providerConfig = this.router.getRoute(null);

            const response = await this.router.chat(
                messages,
                providerConfig
            );

            // If the router returns a string, use it.
            return response.text;
        } catch (error) {
            console.error("Interview Coach Error:", error);
            return "Interviewer is reviewing notes... (Error)";
        }
    }
}

module.exports = new InterviewCoach();
