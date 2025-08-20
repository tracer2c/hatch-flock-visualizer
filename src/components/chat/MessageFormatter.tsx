import React from 'react';

interface MessageFormatterProps {
  content: string;
  className?: string;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ content, className = "" }) => {
  // Parse and format the message content
  const formatMessage = (text: string) => {
    // Split by double newlines to identify paragraphs/sections
    const sections = text.split('\n\n');
    
    return sections.map((section, sectionIndex) => {
      // Check if section is a header (starts with ** and ends with **)
      if (section.match(/^\*\*(.+?)\*\*$/)) {
        const headerText = section.replace(/^\*\*(.+?)\*\*$/, '$1');
        return (
          <h3 key={sectionIndex} className="text-lg font-semibold text-foreground mb-3 mt-4 first:mt-0">
            {headerText}
          </h3>
        );
      }
      
      // Process lines within the section
      const lines = section.split('\n');
      const elements: React.ReactNode[] = [];
      
      lines.forEach((line, lineIndex) => {
        // Skip empty lines
        if (!line.trim()) return;
        
        // Handle bullet points (lines starting with * or -)
        if (line.match(/^[\*\-]\s+/)) {
          const bulletText = line.replace(/^[\*\-]\s+/, '');
          const formattedText = formatInlineText(bulletText);
          elements.push(
            <li key={`${sectionIndex}-${lineIndex}`} className="ml-4 mb-2">
              {formattedText}
            </li>
          );
        }
        // Handle numbered lists
        else if (line.match(/^\d+\.\s+/)) {
          const numberedText = line.replace(/^\d+\.\s+/, '');
          const formattedText = formatInlineText(numberedText);
          elements.push(
            <li key={`${sectionIndex}-${lineIndex}`} className="ml-4 mb-2">
              {formattedText}
            </li>
          );
        }
        // Regular paragraph text
        else {
          const formattedText = formatInlineText(line);
          elements.push(
            <p key={`${sectionIndex}-${lineIndex}`} className="mb-2 leading-relaxed">
              {formattedText}
            </p>
          );
        }
      });
      
      // Wrap bullet points in ul, numbered items in ol
      const hasBullets = lines.some(line => line.match(/^[\*\-]\s+/));
      const hasNumbers = lines.some(line => line.match(/^\d+\.\s+/));
      
      if (hasBullets) {
        return (
          <ul key={sectionIndex} className="list-none space-y-1 mb-4">
            {elements}
          </ul>
        );
      } else if (hasNumbers) {
        return (
          <ol key={sectionIndex} className="list-none space-y-1 mb-4">
            {elements}
          </ol>
        );
      } else {
        return (
          <div key={sectionIndex} className="mb-4">
            {elements}
          </div>
        );
      }
    });
  };
  
  // Format inline text (bold, emphasis, etc.)
  const formatInlineText = (text: string) => {
    // Split by bold markers (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    
    return parts.map((part, index) => {
      if (part.match(/^\*\*[^*]+\*\*$/)) {
        const boldText = part.replace(/^\*\*([^*]+)\*\*$/, '$1');
        return (
          <strong key={index} className="font-semibold text-foreground">
            {boldText}
          </strong>
        );
      }
      return part;
    });
  };
  
  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      {formatMessage(content)}
    </div>
  );
};