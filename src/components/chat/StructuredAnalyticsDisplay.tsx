import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Lightbulb, ClipboardList, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StructuredAnalyticsDisplayProps {
  content: string;
  className?: string;
}

interface ParsedSection {
  type: 'summary' | 'metrics' | 'findings' | 'insights' | 'recommendations' | 'data';
  title?: string;
  content: string[];
}

interface ExtractedMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'critical';
}

export const StructuredAnalyticsDisplay: React.FC<StructuredAnalyticsDisplayProps> = ({
  content,
  className = ""
}) => {
  // Parse the content into structured sections
  const parseContent = (text: string): ParsedSection[] => {
    const sections: ParsedSection[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection: ParsedSection | null = null;
    let summaryLines: string[] = [];
    let inSummary = true;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers
      if (/^(\*\*)?key\s*findings?(\*\*)?:?/i.test(trimmedLine) || 
          /^(\*\*)?findings?(\*\*)?:?$/i.test(trimmedLine)) {
        if (inSummary && summaryLines.length > 0) {
          sections.push({ type: 'summary', content: summaryLines });
          inSummary = false;
        }
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'findings', title: 'Key Findings', content: [] };
        continue;
      }
      
      if (/^(\*\*)?summary\s*[&:]?\s*insights?(\*\*)?:?/i.test(trimmedLine) ||
          /^(\*\*)?insights?(\*\*)?:?$/i.test(trimmedLine)) {
        if (inSummary && summaryLines.length > 0) {
          sections.push({ type: 'summary', content: summaryLines });
          inSummary = false;
        }
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'insights', title: 'Insights', content: [] };
        continue;
      }
      
      if (/^(\*\*)?recommendations?(\*\*)?:?/i.test(trimmedLine)) {
        if (inSummary && summaryLines.length > 0) {
          sections.push({ type: 'summary', content: summaryLines });
          inSummary = false;
        }
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'recommendations', title: 'Recommendations', content: [] };
        continue;
      }

      // Add line to current section or summary
      if (currentSection) {
        if (trimmedLine) currentSection.content.push(trimmedLine);
      } else if (inSummary) {
        summaryLines.push(trimmedLine);
      }
    }

    // Push remaining sections
    if (inSummary && summaryLines.length > 0) {
      sections.push({ type: 'summary', content: summaryLines });
    }
    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  };

  // Extract metrics from text
  const extractMetrics = (text: string): ExtractedMetric[] => {
    const metrics: ExtractedMetric[] = [];
    
    // Extract percentage metrics
    const percentMatches = text.matchAll(/(\d+\.?\d*)\s*%\s*(?:hatch|fertility|rate)?/gi);
    for (const match of percentMatches) {
      const value = parseFloat(match[1]);
      metrics.push({
        label: 'Rate',
        value: `${match[1]}%`,
        trend: value > 80 ? 'up' : value < 70 ? 'down' : 'neutral',
        status: value > 80 ? 'good' : value < 70 ? 'critical' : 'warning'
      });
    }

    // Extract week metrics
    const weekMatches = text.matchAll(/(\d+)\s*weeks?/gi);
    for (const match of weekMatches) {
      metrics.push({
        label: 'Age',
        value: `${match[1]} weeks`,
        trend: 'neutral'
      });
    }

    // Deduplicate by value
    const seen = new Set<string>();
    return metrics.filter(m => {
      if (seen.has(m.value)) return false;
      seen.add(m.value);
      return true;
    }).slice(0, 4);
  };

  // Extract data table from numbered/bulleted lists
  const extractDataTable = (lines: string[]): { headers: string[], rows: string[][] } | null => {
    const dataRows: string[][] = [];
    
    for (const line of lines) {
      // Match numbered data like "1. **FLOCK NAME** - Batch Count: 1 - Hatch Percent: 80%"
      const numberedMatch = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[-–]\s*(.+)/);
      if (numberedMatch) {
        const name = numberedMatch[1];
        const details = numberedMatch[2].split(/\s*[-–]\s*/);
        dataRows.push([name, ...details]);
      }
      
      // Match bullet data
      const bulletMatch = line.match(/^[-•]\s*\*\*(.+?)\*\*:?\s*(.+)/);
      if (bulletMatch) {
        dataRows.push([bulletMatch[1], bulletMatch[2]]);
      }
    }

    if (dataRows.length === 0) return null;

    // Infer headers from first row structure
    const headers = ['Name'];
    if (dataRows[0].length > 1) {
      for (let i = 1; i < dataRows[0].length; i++) {
        const cell = dataRows[0][i];
        const headerMatch = cell.match(/^(.+?):\s*/);
        headers.push(headerMatch ? headerMatch[1] : `Column ${i}`);
      }
    }

    // Clean row values
    const cleanedRows = dataRows.map(row => 
      row.map(cell => cell.replace(/^.+?:\s*/, '').trim())
    );

    return { headers, rows: cleanedRows };
  };

  // Format inline text (bold, etc.)
  const formatInlineText = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Get status icon
  const getStatusIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('increase') || lowerText.includes('higher') || lowerText.includes('best') || lowerText.includes('optimal')) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (lowerText.includes('decrease') || lowerText.includes('lower') || lowerText.includes('warning') || lowerText.includes('concern')) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <Target className="h-4 w-4 text-primary" />;
  };

  const sections = parseContent(content);
  const allText = content;
  const topMetrics = extractMetrics(allText);

  // Check if there's meaningful data to structure
  const hasStructuredContent = sections.length > 1 || topMetrics.length > 0;

  if (!hasStructuredContent) {
    // Fallback to simple formatted display
    return (
      <div className={`space-y-2 ${className}`}>
        {content.split('\n').filter(l => l.trim()).map((line, idx) => (
          <p key={idx} className="text-sm leading-relaxed">
            {formatInlineText(line)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Section */}
      {sections.find(s => s.type === 'summary') && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Analysis Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {sections.find(s => s.type === 'summary')?.content.map((line, idx) => (
                <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                  {formatInlineText(line)}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      {topMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topMetrics.map((metric, idx) => (
            <Card key={idx} className="bg-card/50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  {metric.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                  {metric.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {metric.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Findings Section with Data Table */}
      {sections.find(s => s.type === 'findings') && (() => {
        const findingsSection = sections.find(s => s.type === 'findings')!;
        const tableData = extractDataTable(findingsSection.content);
        
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                {findingsSection.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {tableData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {tableData.headers.map((header, idx) => (
                          <th key={idx} className="text-left py-2 px-2 font-medium text-muted-foreground">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/30">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="py-2 px-2">
                              {cellIdx === 0 ? (
                                <span className="font-medium text-foreground">{cell}</span>
                              ) : (
                                <span className="text-muted-foreground">{cell}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ul className="space-y-2">
                  {findingsSection.content.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {getStatusIcon(item)}
                      <span className="text-muted-foreground">{formatInlineText(item.replace(/^[-•\d.]\s*/, ''))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Insights Section */}
      {sections.find(s => s.type === 'insights') && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {sections.find(s => s.type === 'insights')?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {sections.find(s => s.type === 'insights')?.content.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  {getStatusIcon(item)}
                  <span className="text-muted-foreground">{formatInlineText(item.replace(/^[-•\d.]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Section */}
      {sections.find(s => s.type === 'recommendations') && (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-emerald-500" />
              {sections.find(s => s.type === 'recommendations')?.title}
              <Badge variant="outline" className="ml-auto text-xs border-emerald-500/30 text-emerald-600">
                Action Items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {sections.find(s => s.type === 'recommendations')?.content.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-muted-foreground">{formatInlineText(item.replace(/^[-•\d.]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
