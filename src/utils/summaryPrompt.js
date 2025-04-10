export const generateSummaryPrompt = (transcript) => `
You are an AI research analyst. Analyze the following conversation transcript between a user and an AI interviewer.

Extract and return the following in structured JSON:
{
  "pain_points": ["list of problems or frustrations the user mentioned"],
  "workarounds": ["temporary fixes or solutions they've tried"],
  "tools": ["any tools or platforms they referenced"],
  "emotions": ["emotions or strong phrases used (e.g. frustrated, overwhelmed)"],
  "confidence_score": 3, // number between 1-5, representing how clearly they expressed a real pain point
  "raw_summary": "A 2-3 paragraph summary of the key insights from this interview"
}

Ensure all arrays contain string values even if empty, and that the confidence_score is an integer between 1-5.

Transcript:
${transcript}
`;
