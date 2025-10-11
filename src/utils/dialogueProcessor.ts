// Utility functions for processing dialogue in the game

export interface DialogueInfo {
  hasDialogue: boolean;
  dialogueContent: string;
  enhancedContent: string;
  speakerContext?: string;
}

/**
 * Detects if player input contains dialogue (text within quotes)
 * and extracts the dialogue content
 */
export function detectPlayerDialogue(input: string): DialogueInfo {
  const dialogueRegex = /"([^"]+)"/g;
  const matches = Array.from(input.matchAll(dialogueRegex));
  
  if (matches.length === 0) {
    return {
      hasDialogue: false,
      dialogueContent: '',
      enhancedContent: input
    };
  }

  // Extract all dialogue content
  const dialogueContent = matches.map(match => match[1]).join(' ');
  
  // Try to determine speaker context from surrounding text
  const beforeDialogue = input.slice(0, matches[0].index).trim();
  const speakerContext = extractSpeakerContext(beforeDialogue);

  return {
    hasDialogue: true,
    dialogueContent,
    enhancedContent: input,
    speakerContext
  };
}

/**
 * Extracts speaker context from text before dialogue
 */
function extractSpeakerContext(text: string): string | undefined {
  // Look for common patterns that indicate who is speaking
  const patterns = [
    // "I said" or "I speak"
    /(?:^|\n|\.)\s*I\s+(?:said|speak|ask|reply|answer|whisper|shout|exclaim|murmur|mutter)\s*$/i,
    // "Character name said"
    /(?:^|\n|\.)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|speak|ask|reply|answer|whisper|shout|exclaim|murmur|mutter)\s*$/i,
    // "said Character name"
    /(?:said|speak|ask|reply|answer|whisper|shout|exclaim|murmur|mutter)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/i,
    // Vietnamese patterns
    /(?:^|\n|\.)\s*Tôi\s+(?:nói|thì thầm|hét lên|thốt lên|đáp|trả lời|hỏi|nói với|nói rằng)\s*$/i,
    /(?:^|\n|\.)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:nói|thì thầm|hét lên|thốt lên|đáp|trả lời|hỏi|nói với|nói rằng)\s*$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // If it's "I", return "Player" or "Character"
      if (match[0].toLowerCase().includes('i ')) {
        return 'Player';
      }
      // If it's a character name, return that name
      if (match[1]) {
        return match[1].trim();
      }
    }
  }

  return undefined;
}

/**
 * Enhances dialogue content for AI processing
 * This function can be used to modify dialogue before sending to AI
 */
export function enhanceDialogueForAI(
  dialogueContent: string, 
  context: {
    currentLocation?: string;
    npcName?: string;
    relationshipLevel?: number;
    gameContext?: string;
  }
): string {
  // Add context-aware enhancements to dialogue
  let enhanced = dialogueContent;

  // Add emotional context based on relationship
  if (context.relationshipLevel !== undefined) {
    if (context.relationshipLevel > 50) {
      // Friendly relationship - dialogue can be more casual
      enhanced = `[Friendly tone] ${enhanced}`;
    } else if (context.relationshipLevel < -50) {
      // Hostile relationship - dialogue should be more cautious
      enhanced = `[Cautious tone] ${enhanced}`;
    }
  }

  // Add location context
  if (context.currentLocation) {
    enhanced = `[Location: ${context.currentLocation}] ${enhanced}`;
  }

  // Add NPC context
  if (context.npcName) {
    enhanced = `[Speaking to: ${context.npcName}] ${enhanced}`;
  }

  // Add paraphrase instruction for AI
  enhanced = `[DIALOGUE TO PARAPHRASE: "${dialogueContent}"] ${enhanced}`;

  return enhanced;
}

/**
 * Processes AI response to enhance dialogue presentation
 */
export function processAIResponseForDialogue(response: string): string {
  // This function can be used to post-process AI responses
  // to ensure dialogue is properly formatted and enhanced
  
  // For now, just return the response as-is
  // In the future, this could be used to:
  // - Add more context to dialogue
  // - Enhance emotional tone
  // - Add speaker identification
  // - Format dialogue better
  
  return response;
}
