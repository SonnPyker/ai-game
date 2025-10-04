
interface DialogueRendererProps {
  content: string;
  className?: string;
  isPlayer?: boolean;
}

interface DialogueSegment {
  type: 'dialogue' | 'text';
  content: string;
  speaker?: string;
}

export function DialogueRenderer({ content, className = '', isPlayer = false }: DialogueRendererProps) {
  // Function to highlight names and locations with /.../ syntax
  const highlightNames = (text: string) => {
    const nameRegex = /\/([^\/]+)\//g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = nameRegex.exec(text)) !== null) {
      // Add text before the name
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add highlighted name
      parts.push({
        type: 'highlight',
        content: match[1]
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  // Parse content to identify dialogue segments and highlight names
  const parseDialogue = (text: string): DialogueSegment[] => {
    const segments: DialogueSegment[] = [];
    const dialogueRegex = /"([^"]+)"/g;
    let lastIndex = 0;
    let match;

    while ((match = dialogueRegex.exec(text)) !== null) {
      // Add text before dialogue
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index).trim();
        if (beforeText) {
          segments.push({
            type: 'text',
            content: beforeText
          });
        }
      }

      // Add dialogue
      const dialogueContent = match[1];
      // Try to extract speaker from context (look for name patterns before the dialogue)
      const beforeDialogue = text.slice(Math.max(0, match.index - 150), match.index);
      
      // Multiple patterns to detect speaker names
      const speakerPatterns = [
        // Pattern 1: Name followed by colon or dash
        /(?:^|\n|\.)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:\-]\s*$/,
        // Pattern 2: "Name said" or "Name spoke"
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:said|spoke|asked|replied|answered|whispered|shouted|exclaimed|murmured|muttered)\s*$/i,
        // Pattern 3: "said Name" or "spoke Name"
        /(?:said|spoke|asked|replied|answered|whispered|shouted|exclaimed|murmured|muttered)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/i,
        // Pattern 4: Name at the beginning of a sentence
        /(?:^|\n|\.)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:nói|thì thầm|hét lên|thốt lên|đáp|trả lời|hỏi|nói với|nói rằng)/i,
        // Pattern 5: For player dialogue, detect "I" patterns
        /(?:^|\n|\.)\s*I\s+(?:said|speak|ask|reply|answer|whisper|shout|exclaim|murmur|mutter|nói|thì thầm|hét lên|thốt lên|đáp|trả lời|hỏi|nói với|nói rằng)\s*$/i
      ];

      let speaker: string | undefined;
      for (const pattern of speakerPatterns) {
        const speakerMatch = beforeDialogue.match(pattern);
        if (speakerMatch) {
          // Special handling for "I" patterns
          if (pattern.source.includes('I\\s+')) {
            speaker = isPlayer ? 'Player' : 'Character';
          } else {
            speaker = speakerMatch[1].trim();
          }
          break;
        }
      }

      segments.push({
        type: 'dialogue',
        content: dialogueContent,
        speaker: speaker
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim();
      if (remainingText) {
        segments.push({
          type: 'text',
          content: remainingText
        });
      }
    }

    return segments;
  };

  const segments = parseDialogue(content);

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'dialogue') {
          return (
            <div key={index} className="my-4">
              {segment.speaker && (
                <div className="text-xs text-gray-400 mb-2 opacity-70 font-medium">
                  {segment.speaker}
                </div>
              )}
              <div className={`${
                isPlayer 
                  ? 'bg-green-500/10 border-l-4 border-green-400/60 text-green-100' 
                  : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-l-4 border-blue-400/60 text-blue-100'
              } pl-4 py-3 italic rounded-r-lg shadow-sm`}>
                <div className="flex items-start">
                  <span className={`${
                    isPlayer ? 'text-green-300' : 'text-blue-300'
                  } mr-2 text-lg leading-none`}>"</span>
                  <span className="flex-1 leading-relaxed">
                    {highlightNames(segment.content).map((part, partIndex) => {
                      if (part.type === 'highlight') {
                        return (
                          <span 
                            key={partIndex}
                            className="text-yellow-300 font-semibold"
                          >
                            {part.content}
                          </span>
                        );
                      } else {
                        return part.content;
                      }
                    })}
                  </span>
                  <span className={`${
                    isPlayer ? 'text-green-300' : 'text-blue-300'
                  } ml-2 text-lg leading-none`}>"</span>
                </div>
              </div>
            </div>
          );
        } else {
          const highlightedParts = highlightNames(segment.content);
          return (
            <span key={index} className="whitespace-pre-wrap leading-relaxed">
              {highlightedParts.map((part, partIndex) => {
                if (part.type === 'highlight') {
                  return (
                    <span 
                      key={partIndex}
                      className="text-yellow-300 font-semibold"
                    >
                      {part.content}
                    </span>
                  );
                } else {
                  return part.content;
                }
              })}
            </span>
          );
        }
      })}
    </div>
  );
}
