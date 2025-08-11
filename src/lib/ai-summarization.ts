import { GoogleGenerativeAI } from '@google/generative-ai';
import { summaryStorageService } from './summary-storage';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY || '');
const getModel = (variant: 'pro' | 'flash' = 'pro') =>
  genAI.getGenerativeModel({ model: variant === 'pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash' });

const PREFER_FLASH_FLAG = 'gemini_prefer_flash_this_session';
const getPreferredModel = (): 'pro' | 'flash' => {
  const envPref = (import.meta.env.VITE_GEMINI_MODEL || '').toLowerCase();
  if (envPref === 'flash') return 'flash';
  if (typeof window !== 'undefined' && sessionStorage.getItem(PREFER_FLASH_FLAG) === 'true') {
    return 'flash';
  }
  return 'pro';
};

export interface NotionContent {
  id: string;
  title: string;
  content: string;
  type: 'page' | 'database' | 'block' | 'toggle';
  lastEdited: string;
  url: string;
  properties?: Record<string, any>;
  // Toggle-specific properties
  contentType?: 'toggle' | 'regular';
  toggleTitle?: string;
  parentPage?: string;
  wordCount?: number;
}

export interface SummaryOptions {
  style: 'executive' | 'detailed' | 'bullet_points' | 'action_items';
  length: 'short' | 'medium' | 'long';
  focus: string[]; // e.g., ['tasks', 'ideas', 'decisions', 'questions']
  includeActionItems: boolean;
  includePriority: boolean;
}

export interface SummaryResult {
  id: string;
  userId: string;
  summary: string;
  actionItems: ActionItem[];
  keyInsights: string[];
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: string;
  sourceContent: NotionContent[];
  wordCount: number;
  readingTime: number;
  // Recycle bin properties
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ActionItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  category: string;
  completed: boolean;
}

export class AISummarizationService {
  private readonly MAX_TOKENS_PER_REQUEST = 4000;
  private readonly CONTEXT_WINDOW = 32000; // Gemini 1.5 Pro context window
  private readonly REPETITION_THRESHOLD = 0.01; // 1% threshold for allowing repetition

  constructor() {
    if (!import.meta.env.VITE_GOOGLE_AI_API_KEY) {
      console.warn('Google AI API key not found. AI features will be disabled.');
    }
  }

  /**
   * Get previously summarized content for a user
   */
  private async getPreviouslySummarizedContent(userId: string): Promise<{
    contentIds: Set<string>;
    summaryCount: number;
    totalContentCount: number;
    recentSummaries: SummaryResult[];
  }> {
    try {
      // Get recent summaries (last 50)
      const recentSummaries = await summaryStorageService.getUserSummaries(userId, 50);
      
      // Extract all content IDs that have been summarized
      const contentIds = new Set<string>();
      let totalContentCount = 0;
      
      recentSummaries.forEach(summary => {
        summary.sourceContent.forEach(content => {
          contentIds.add(content.id);
          totalContentCount++;
        });
      });
      
      console.log(`📊 SUMMARY HISTORY ANALYSIS:`);
      console.log(`   📝 Total summaries generated: ${recentSummaries.length}`);
      console.log(`   📄 Unique content items summarized: ${contentIds.size}`);
      console.log(`   🔄 Total content instances processed: ${totalContentCount}`);
      
      return {
        contentIds,
        summaryCount: recentSummaries.length,
        totalContentCount,
        recentSummaries
      };
    } catch (error) {
      console.warn('Failed to get previous summaries, proceeding without history:', error);
      return {
        contentIds: new Set(),
        summaryCount: 0,
        totalContentCount: 0,
        recentSummaries: []
      };
    }
  }

  /**
   * Check if we should allow repetition based on the 1% threshold
   */
  private shouldAllowRepetition(
    availableUnprocessed: number,
    totalAvailable: number,
    summaryHistory: { summaryCount: number; totalContentCount: number }
  ): boolean {
    // If we have unprocessed content, don't allow repetition
    if (availableUnprocessed > 0) {
      console.log(`🚫 REPETITION CHECK: ${availableUnprocessed} unprocessed items available, no repetition needed`);
      return false;
    }
    
    // Calculate repetition percentage
    const repetitionPercentage = summaryHistory.summaryCount / Math.max(summaryHistory.totalContentCount, 1);
    const allowRepetition = repetitionPercentage >= this.REPETITION_THRESHOLD;
    
    console.log(`🔄 REPETITION ANALYSIS:`);
    console.log(`   📊 Summaries generated: ${summaryHistory.summaryCount}`);
    console.log(`   📄 Content instances processed: ${summaryHistory.totalContentCount}`);
    console.log(`   📈 Repetition percentage: ${(repetitionPercentage * 100).toFixed(2)}%`);
    console.log(`   🎯 Threshold: ${(this.REPETITION_THRESHOLD * 100).toFixed(2)}%`);
    console.log(`   ✅ Allow repetition: ${allowRepetition ? 'YES' : 'NO'}`);
    
    return allowRepetition;
  }

  /**
   * Select content for repetition with different perspective
   */
  private selectContentForRepetition(
    content: NotionContent[],
    summaryHistory: { recentSummaries: SummaryResult[] }
  ): NotionContent | null {
    console.log(`🔄 SELECTING CONTENT FOR REPETITION WITH NEW PERSPECTIVE:`);
    
    // Find content that was summarized longest ago for fresh perspective
    const contentLastSummarized = new Map<string, number>();
    
    summaryHistory.recentSummaries.forEach((summary, index) => {
      const summaryAge = summaryHistory.recentSummaries.length - index; // Older = higher number
      summary.sourceContent.forEach(content => {
        if (!contentLastSummarized.has(content.id) || contentLastSummarized.get(content.id)! < summaryAge) {
          contentLastSummarized.set(content.id, summaryAge);
        }
      });
    });
    
    // Score content based on how long ago it was last summarized
    const scoredContent = content.map(item => {
      const lastSummarizedAge = contentLastSummarized.get(item.id) || 0;
      const baseScore = this.scoreUniversalFactors(item);
      const repetitionBonus = lastSummarizedAge * 10; // Bonus for older summaries
      
      return {
        item,
        score: baseScore + repetitionBonus,
        lastSummarizedAge,
        debugInfo: {
          title: item.title,
          lastSummarizedAge,
          baseScore,
          repetitionBonus,
          totalScore: baseScore + repetitionBonus
        }
      };
    });
    
    // Sort by score (highest first)
    scoredContent.sort((a, b) => b.score - a.score);
    
    console.log(`   📋 TOP CANDIDATES FOR REPETITION:`);
    scoredContent.slice(0, 5).forEach((item, index) => {
      console.log(`   ${index + 1}. "${item.debugInfo.title}"`);
      console.log(`      🕐 Last summarized: ${item.lastSummarizedAge} summaries ago`);
      console.log(`      📊 Score: ${item.debugInfo.totalScore} (base: ${item.debugInfo.baseScore} + repetition: ${item.debugInfo.repetitionBonus})`);
    });
    
    const selectedItem = scoredContent[0]?.item || null;
    
    if (selectedItem) {
      const selectedScore = scoredContent[0];
      console.log(`   ✅ SELECTED FOR REPETITION: "${selectedItem.title}"`);
      console.log(`   🔄 Last summarized: ${selectedScore.lastSummarizedAge} summaries ago`);
      console.log(`   💡 Will generate summary with different perspective/angle`);
    }
    
    return selectedItem;
  }

  /**
   * Universal smart note selection with adaptive content prioritization and repetition awareness
   * Intelligently selects the most valuable content based on type, quality, user patterns, and summary history
   */
  private async selectSmartNote(content: NotionContent[], userId: string): Promise<NotionContent | null> {
    if (content.length === 0) return null;
    
    console.log(`🎯 SMART SELECTION WITH REPETITION AWARENESS:`);
    console.log(`   📊 Evaluating ${content.length} content items`);
    
    // Get summary history to understand what's been processed
    const summaryHistory = await this.getPreviouslySummarizedContent(userId);
    
    // Categorize content by type
    const contentByType = this.categorizeContent(content);
    
    console.log(`📋 CONTENT DISTRIBUTION:`, {
      toggles: contentByType.toggles.length,
      sections: contentByType.sections.length,
      listItems: contentByType.listItems.length,
      highlights: contentByType.highlights.length,
      pages: contentByType.pages.length,
    });
    
    // Filter out content that has been summarized (using persistent history)
    const filterPreviouslySummarized = (items: NotionContent[]) => {
      return items.filter(item => !summaryHistory.contentIds.has(item.id));
    };
    
    // Get processing history for recent 24-hour filtering
    const getProcessedKey = (id: string) => `processed_${userId}_${id}`;
    const lastProcessedKey = `last_processed_note_${userId}`;
    
    // Filter out recently processed content (within last 24 hours) - this is for immediate repetition prevention
    const filterRecentlyProcessed = (items: NotionContent[]) => {
      return items.filter(item => {
        const processedKey = getProcessedKey(item.id);
        const lastProcessed = localStorage.getItem(processedKey);
        if (lastProcessed) {
          const timeDiff = Date.now() - parseInt(lastProcessed);
          const dayInMs = 24 * 60 * 60 * 1000;
          return timeDiff > dayInMs;
        }
        return true;
      });
    };
    
    // Apply both filters: first remove previously summarized, then remove recently processed
    const getAvailableContent = (items: NotionContent[]) => {
      const notSummarized = filterPreviouslySummarized(items);
      return filterRecentlyProcessed(notSummarized);
    };
    
    // Filter each content type
    const availableContent = {
      toggles: getAvailableContent(contentByType.toggles),
      sections: getAvailableContent(contentByType.sections),
      listItems: getAvailableContent(contentByType.listItems),
      highlights: getAvailableContent(contentByType.highlights),
      pages: getAvailableContent(contentByType.pages),
    };
    
    const totalAvailable = Object.values(availableContent).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log(`🔍 AVAILABILITY ANALYSIS:`);
    console.log(`   📊 Unprocessed content available: ${totalAvailable}`);
    console.log(`   📈 Previously summarized: ${summaryHistory.contentIds.size} unique items`);
    
    // Check if we should allow repetition
    if (totalAvailable === 0) {
      const shouldRepeat = this.shouldAllowRepetition(
        totalAvailable,
        content.length,
        summaryHistory
      );
      
      if (shouldRepeat) {
        console.log(`🔄 ENABLING REPETITION MODE: Selecting content for new perspective`);
        return this.selectContentForRepetition(content, summaryHistory);
      } else {
        console.log(`🚫 NO REPETITION: Not enough summaries generated yet (need ${(this.REPETITION_THRESHOLD * 100).toFixed(1)}% threshold)`);
        return null;
      }
    }
    
    // Score all content with type-specific logic
    const allScored = [
      ...this.scoreContentByType(availableContent.toggles, 'toggle'),
      ...this.scoreContentByType(availableContent.sections, 'section'),
      ...this.scoreContentByType(availableContent.listItems, 'list_item'),
      ...this.scoreContentByType(availableContent.highlights, 'highlight'),
      ...this.scoreContentByType(availableContent.pages, 'page'),
    ];
    
    // Sort by score (highest first)
    allScored.sort((a, b) => b.score - a.score);
    
    // Debug logging
    console.log('Top 5 scored items:');
    allScored.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. [${item.contentType.toUpperCase()}] "${item.debugInfo.title}" - Score: ${item.score}`);
      console.log(`   Words: ${item.debugInfo.wordCount}, Age: ${item.debugInfo.ageInDays}d, Type: ${item.debugInfo.contentType}`);
    });
    
    // Select the highest scoring item (ONLY ONE)
    const selectedItem = allScored[0]?.item || null;
    
    if (selectedItem) {
      // Mark as processed
      const processedKey = getProcessedKey(selectedItem.id);
      localStorage.setItem(processedKey, Date.now().toString());
      localStorage.setItem(lastProcessedKey, selectedItem.id);
      
      const selectedType = allScored[0].contentType;
      const selectedScore = allScored[0].score;
      
      console.log(`🎯 SMART SELECTION RESULT (SINGLE ITEM ONLY):`);
      console.log(`   ✅ Selected: [${selectedType.toUpperCase()}] "${selectedItem.title}"`);
      console.log(`   📊 Score: ${selectedScore}`);
      console.log(`   📊 Content length: ${selectedItem.content.length} characters`);
      console.log(`   📊 Word count: ${(selectedItem as any).wordCount || selectedItem.content.split(/\s+/).length} words`);
      
      if (selectedType === 'toggle') {
        const toggleItem = selectedItem as any;
        console.log(`   🔽 SINGLE TOGGLE SELECTED:`);
        console.log(`      📄 Parent Page: ${toggleItem.parentPage}`);
        console.log(`      🔽 Toggle Title: ${toggleItem.toggleTitle}`);
        console.log(`      🔧 Extraction Method: ${toggleItem.extractionMethod}`);
        console.log(`      🔒 Is Closed Toggle: ${toggleItem.isClosedToggle}`);
        console.log(`      ⚠️  This is ONE INDIVIDUAL TOGGLE - not multiple toggles combined`);
      }
      
      console.log(`   📄 Content preview: "${selectedItem.content.substring(0, 200)}..."`);
      console.log(`   🚨 CRITICAL: Only this ONE item will be processed by AI`);
      console.log(`   🚨 If you see multiple sources in the summary, there's a bug!`);
      
      // Additional validation
      const contentSections = selectedItem.content.match(/--- (TOGGLE|SECTION|LIST|HIGHLIGHT|PAGE) CONTENT ---/g) || [];
      if (contentSections.length > 1) {
        console.error(`   ❌ ERROR: Selected item contains ${contentSections.length} content sections!`);
        console.error(`   📄 This suggests the item was incorrectly combined from multiple sources`);
        console.error(`   🔍 Content sections found: ${contentSections.join(', ')}`);
      } else {
        console.log(`   ✅ VALIDATION: Selected item contains ${contentSections.length || 1} content section (correct)`);
      }
      
    } else {
      console.log('❌ Smart selection: No suitable content found');
    }
    
    return selectedItem;
  }

  // Categorize content by type for better organization
  private categorizeContent(content: NotionContent[]) {
    return {
      toggles: content.filter((item: any) => item.contentType === 'toggle'),
      sections: content.filter((item: any) => item.contentType === 'section'),
      listItems: content.filter((item: any) => item.contentType === 'list_item'),
      highlights: content.filter((item: any) => item.contentType === 'highlight'),
      pages: content.filter((item: any) => item.contentType === 'page' || !item.contentType),
    };
  }

  // Score content with type-specific logic
  private scoreContentByType(items: NotionContent[], contentType: string) {
    return items.map(item => {
      let score = 0;
      const itemAny = item as any;
      
      // TYPE-SPECIFIC SCORING
      switch (contentType) {
        case 'toggle':
          score += 15; // High priority for focused content
          score += this.scoreToggleContent(itemAny);
          break;
          
        case 'section':
          score += 12; // Good priority for structured content
          score += this.scoreSectionContent(itemAny);
          break;
          
        case 'list_item':
          score += 8; // Medium priority for individual items
          score += this.scoreListContent(itemAny);
          break;
          
        case 'highlight':
          score += 10; // Good priority for important content
          score += this.scoreHighlightContent(itemAny);
          break;
          
        case 'page':
          score += 5; // Base priority for full pages
          score += this.scorePageContent(itemAny);
          break;
      }
      
      // UNIVERSAL SCORING (applies to all content types)
      score += this.scoreUniversalFactors(item);
      
      const ageInDays = (Date.now() - new Date(item.lastEdited).getTime()) / (1000 * 60 * 60 * 24);
      const wordCount = itemAny.wordCount || item.content.split(/\s+/).length;
      
      return { 
        item, 
        score, 
        contentType,
        debugInfo: {
          wordCount,
          ageInDays: Math.round(ageInDays * 10) / 10,
          contentType,
          title: item.title
        }
      };
    });
  }

  // Toggle-specific scoring with enhanced individual toggle prioritization
  private scoreToggleContent(item: any): number {
    let score = 0;
    
    const toggleTitle = item.toggleTitle || '';
    const parentPage = item.parentPage || '';
    const content = item.content || '';
    
    console.log(`  📊 Scoring toggle: "${toggleTitle}"`);
    
    // Learning content indicators
    const learningKeywords = [
      'youtube', 'video', 'article', 'tutorial', 'course', 'lesson',
      'notes from', 'takeaways', 'insights', 'summary', 'key points'
    ];
    
    const learningScore = learningKeywords.reduce((acc, keyword) => {
      const inTitle = toggleTitle.toLowerCase().includes(keyword) ? 2 : 0;
      const inParent = parentPage.toLowerCase().includes(keyword) ? 1 : 0;
      return acc + inTitle + inParent;
    }, 0);
    
    score += learningScore * 3; // 3x multiplier for learning content
    console.log(`    📚 Learning content score: +${learningScore * 3}`);
    
    // Structured title patterns (common in YouTube titles)
    if (toggleTitle.includes('|') || toggleTitle.includes('-') || toggleTitle.includes(':')) {
      score += 5;
      console.log(`    📝 Structured title bonus: +5`);
    }
    
    // Content richness scoring
    const wordCount = item.wordCount || 0;
    let wordCountBonus = 0;
    if (wordCount > 50) {
      wordCountBonus += 8;
      console.log(`    📖 Word count bonus (>50): +8`);
    }
    if (wordCount > 150) {
      wordCountBonus += 7;
      console.log(`    📖 Word count bonus (>150): +7`);
    }
    if (wordCount > 300) {
      wordCountBonus += 5;
      console.log(`    📖 Word count bonus (>300): +5`);
    }
    score += wordCountBonus;
    
    // Content quality indicators
    const qualityKeywords = [
      'strategy', 'technique', 'method', 'approach', 'framework', 'principle',
      'tip', 'advice', 'insight', 'lesson', 'key', 'important', 'crucial'
    ];
    
    const qualityScore = qualityKeywords.reduce((acc, keyword) => 
      acc + (content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    score += qualityScore * 2;
    console.log(`    💎 Quality indicators: +${qualityScore * 2}`);
    
    // Actionable content bonus
    const actionKeywords = [
      'implement', 'apply', 'use', 'try', 'practice', 'build', 'create',
      'step', 'process', 'routine', 'habit', 'system'
    ];
    
    const actionScore = actionKeywords.reduce((acc, keyword) => 
      acc + (content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    score += actionScore * 1.5;
    console.log(`    🎯 Actionable content: +${actionScore * 1.5}`);
    
    // Recency bonus for individual toggles (they're usually current)
    score += 5; // Small bonus for being a focused toggle
    console.log(`    ⏰ Toggle focus bonus: +5`);
    
    console.log(`    🏆 Total toggle score for "${toggleTitle}": ${score}`);
    return score;
  }

  // Section-specific scoring
  private scoreSectionContent(item: any): number {
    let score = 0;
    
    const sectionTitle = item.sectionTitle || '';
    
    // Important section indicators
    const importantSections = [
      'summary', 'conclusion', 'key points', 'takeaways', 'action items',
      'next steps', 'decisions', 'outcomes', 'results'
    ];
    
    const importanceScore = importantSections.reduce((acc, keyword) => 
      acc + (sectionTitle.toLowerCase().includes(keyword) ? 3 : 0), 0);
    score += importanceScore;
    
    // Word count quality
    const wordCount = item.wordCount || 0;
    if (wordCount > 100) score += 6;
    if (wordCount > 300) score += 4;
    
    return score;
  }

  // List item-specific scoring
  private scoreListContent(item: any): number {
    let score = 0;
    
    // Task completion status
    if (item.listType === 'to_do') {
      score += 5; // Tasks are valuable
      if (!item.isCompleted) score += 3; // Incomplete tasks more urgent
    }
    
    // Action-oriented content
    const actionKeywords = ['todo', 'task', 'action', 'implement', 'fix', 'create', 'update'];
    const actionScore = actionKeywords.reduce((acc, keyword) => 
      acc + (item.content.toLowerCase().includes(keyword) ? 2 : 0), 0);
    score += actionScore;
    
    return score;
  }

  // Highlight-specific scoring
  private scoreHighlightContent(item: any): number {
    let score = 0;
    
    // Callouts often contain important information
    if (item.type === 'callout') score += 4;
    if (item.type === 'quote') score += 3;
    
    // Important content indicators
    const importantKeywords = ['important', 'note', 'warning', 'tip', 'remember'];
    const importanceScore = importantKeywords.reduce((acc, keyword) => 
      acc + (item.content.toLowerCase().includes(keyword) ? 2 : 0), 0);
    score += importanceScore;
    
    return score;
  }

  // Page-specific scoring
  private scorePageContent(item: any): number {
    let score = 0;
    
    // Content structure analysis
    if (item.contentStructure) {
      const structure = item.contentStructure;
      
      // Bonus for rich, structured content
      if (structure.contentDensity === 'high') score += 8;
      else if (structure.contentDensity === 'medium') score += 4;
      
      // Bonus for diverse content types
      if (structure.totalBlocks > 10) score += 3;
      if (structure.headingCount > 2) score += 2;
      if (structure.codeBlockCount > 0) score += 2;
    }
    
    return score;
  }

  // Universal scoring factors that apply to all content types
  private scoreUniversalFactors(item: NotionContent): number {
    let score = 0;
    
    // Recency score
    const ageInDays = (Date.now() - new Date(item.lastEdited).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - ageInDays); // 10 points for today, decreasing
    
    // Action potential
    const actionKeywords = ['todo', 'task', 'action', 'follow up', 'next step', 'implement', 'try', 'practice'];
    const actionScore = actionKeywords.reduce((acc, keyword) => 
      acc + (item.content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    score += actionScore * 2;
    
    // Insight indicators
    const insightKeywords = ['insight', 'takeaway', 'key point', 'important', 'remember', 'note', 'tip'];
    const insightScore = insightKeywords.reduce((acc, keyword) => 
      acc + (item.content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    score += insightScore * 1.5;
    
    // Meeting/Event content
    if (item.title.toLowerCase().includes('meeting') || 
        item.content.toLowerCase().includes('meeting')) {
      score += 6;
    }
    
    // Project-related content
    if (item.title.toLowerCase().includes('project') || 
        item.content.toLowerCase().includes('project')) {
      score += 4;
    }
    
    // Avoid very short content
    const contentLength = item.content.trim().length;
    if (contentLength < 50) score -= 5; // Penalty for very short content
    
    return score;
  }

  /**
   * Smart summarization function - selects ONE note intelligently with repetition awareness
   */
  async smartSummarizeContent(
    content: NotionContent[],
    options: SummaryOptions,
    userId: string
  ): Promise<SummaryResult> {
    try {
      console.log(`🎯 SMART SUMMARIZATION STARTING:`);
      console.log(`   Available content items: ${content.length}`);
      console.log(`   Content types: ${content.map((c: any) => c.contentType || c.type).join(', ')}`);
      
      // Debug: Log all available content
      console.log(`📋 ALL AVAILABLE CONTENT:`);
      content.forEach((item, index) => {
        const itemAny = item as any;
        console.log(`   ${index + 1}. "${item.title}" (${itemAny.contentType || item.type})`);
        console.log(`      Content preview: "${item.content.substring(0, 100)}..."`);
        console.log(`      Word count: ${itemAny.wordCount || item.content.split(/\s+/).length}`);
      });
      
      // Step 1: Smart note selection (SELECTS ONLY ONE)
      const selectedNote = this.selectSmartNote(content, userId);
      
      if (!selectedNote) {
        throw new Error('No suitable notes found for summarization');
      }
      
      console.log(`🎯 SINGLE NOTE SELECTED FOR PROCESSING:`);
      console.log(`   ✅ Selected: "${selectedNote.title}"`);
      console.log(`   📊 Type: ${(selectedNote as any).contentType || selectedNote.type}`);
      console.log(`   📊 Content length: ${selectedNote.content.length} characters`);
      console.log(`   📊 Word count: ${(selectedNote as any).wordCount || selectedNote.content.split(/\s+/).length}`);
      
      // CRITICAL VALIDATION: Ensure we only have ONE item
      const selectedContent = [selectedNote];
      if (selectedContent.length !== 1) {
        throw new Error(`CRITICAL ERROR: Expected 1 item, got ${selectedContent.length}`);
      }
      
      console.log(`   ✅ VALIDATION PASSED: Processing exactly ${selectedContent.length} item`);
      console.log(`   📄 Content preview: "${selectedNote.content.substring(0, 200)}..."`);
      
      // Step 2: Check if this is a repetition and get previous summaries
      const summaryHistory = await this.getPreviouslySummarizedContent(userId);
      const isRepetition = summaryHistory.contentIds.has(selectedNote.id);
      let previousSummaries: string[] = [];
      
      if (isRepetition) {
        console.log(`   🔄 REPETITION DETECTED: This content was previously summarized`);
        // Get previous summaries of this content for context
        previousSummaries = summaryHistory.recentSummaries
          .filter(summary => summary.sourceContent.some(content => content.id === selectedNote.id))
          .map(summary => summary.summary)
          .slice(0, 3); // Last 3 summaries for context
        
        console.log(`   📚 Found ${previousSummaries.length} previous summaries for context`);
      }
      
      // Step 3: Preprocess the selected content
      const processedContent = await this.preprocessContent(selectedContent);
      console.log(`   📝 Preprocessed content length: ${processedContent.length} characters`);
      
      // Additional validation: Check if preprocessed content contains multiple sources
      const sourceCount = (processedContent.match(/--- (TOGGLE|SECTION|LIST|HIGHLIGHT|PAGE) CONTENT ---/g) || []).length;
      console.log(`   🔍 Source sections in preprocessed content: ${sourceCount}`);
      
      if (sourceCount > 1) {
        console.warn(`   ⚠️  WARNING: Preprocessed content contains ${sourceCount} sources, expected 1`);
        console.warn(`   📄 Preprocessed content preview: "${processedContent.substring(0, 300)}..."`);
      }
      
      // Step 4: Generate summary with AI (with repetition awareness)
      console.log(`   🤖 Sending SINGLE ITEM to AI for summarization...`);
      if (isRepetition) {
        console.log(`   🔄 Using REPETITION MODE: Will generate fresh perspective`);
      }
      
      const summaryData = await this.generateSummaryWithAI(
        processedContent, 
        options, 
        isRepetition, 
        previousSummaries
      );
      
      // Step 4: Extract action items and insights from the selected note only
      const actionItems = await this.extractActionItems(processedContent);
      const keyInsights = await this.extractKeyInsights(processedContent);
      
      // Step 5: Determine priority and tags
      const priority = this.determinePriority(summaryData, actionItems);
      const tags = this.generateTags(selectedContent, summaryData);
      
      // Step 6: Create result object
      const result: SummaryResult = {
        id: this.generateId(),
        userId,
        summary: summaryData,
        actionItems,
        keyInsights,
        priority,
        tags: [...tags, 'smart-selection'], // Add smart selection tag
        createdAt: new Date().toISOString(),
        sourceContent: selectedContent, // Only the selected note (1 item)
        wordCount: this.countWords(summaryData),
        readingTime: this.calculateReadingTime(summaryData),
      };

      // Step 6: Save the summary to storage
      try {
        await summaryStorageService.saveSummary(result);
        console.log(`   💾 Summary saved to storage successfully`);
      } catch (storageError) {
        console.warn(`   ⚠️  Failed to save summary to storage:`, storageError);
        // Don't fail the entire operation if storage fails
      }

      console.log(`🎯 SMART SUMMARIZATION COMPLETE:`);
      console.log(`   ✅ Summary generated from SINGLE source: "${selectedNote.title}"`);
      console.log(`   📊 Summary length: ${result.wordCount} words`);
      console.log(`   📊 Action items: ${result.actionItems.length}`);
      console.log(`   📊 Key insights: ${result.keyInsights.length}`);
      console.log(`   📊 Source content items: ${result.sourceContent.length} (MUST be 1)`);
      console.log(`   🔄 Is repetition: ${isRepetition ? 'YES' : 'NO'}`);
      
      // Final validation
      if (result.sourceContent.length !== 1) {
        throw new Error(`CRITICAL ERROR: Result contains ${result.sourceContent.length} sources, expected 1`);
      }

      return result;
    } catch (error) {
      console.error('Smart AI Summarization failed:', error);
      throw new Error('Failed to generate summary. Please try again.');
    }
  }

  /**
   * Main summarization function with smart note selection
   */
  async summarizeContent(
    content: NotionContent[],
    options: SummaryOptions,
    userId: string
  ): Promise<SummaryResult> {
    try {
      // Step 1: Preprocess and chunk content
      const processedContent = await this.preprocessContent(content);
      
      // Step 2: Generate summary with AI
      const summaryData = await this.generateSummaryWithAI(processedContent, options);
      
      // Step 3: Extract action items and insights
      const actionItems = await this.extractActionItems(processedContent);
      const keyInsights = await this.extractKeyInsights(processedContent);
      
      // Step 4: Determine priority and tags
      const priority = this.determinePriority(summaryData, actionItems);
      const tags = this.generateTags(processedContent, summaryData);
      
      // Step 5: Create result object
      const result: SummaryResult = {
        id: this.generateId(),
        userId,
        summary: summaryData,
        actionItems,
        keyInsights,
        priority,
        tags,
        createdAt: new Date().toISOString(),
        sourceContent: content,
        wordCount: this.countWords(summaryData),
        readingTime: this.calculateReadingTime(summaryData),
      };

      return result;
    } catch (error) {
      console.error('AI Summarization failed:', error);
      throw new Error('Failed to generate summary. Please try again.');
    }
  }

  /**
   * Preprocess Notion content for AI consumption with universal content type formatting
   */
  private async preprocessContent(content: NotionContent[]): Promise<string> {
    let processedText = '';
    
    // CRITICAL: Ensure we're only processing ONE item
    if (content.length !== 1) {
      console.error(`❌ PREPROCESSING ERROR: Expected 1 item, got ${content.length}`);
      console.error(`📋 Items received:`, content.map(c => c.title));
      throw new Error(`Preprocessing should only receive 1 content item, got ${content.length}`);
    }
    
    const item = content[0];
    const itemAny = item as any;
    const contentType = itemAny.contentType || 'page';
    
    console.log(`📝 PREPROCESSING SINGLE ITEM:`);
    console.log(`   Title: "${item.title}"`);
    console.log(`   Type: ${contentType}`);
    console.log(`   Content length: ${item.content.length} chars`);
    
    // Handle different content types with appropriate formatting
    switch (contentType) {
      case 'toggle':
        processedText += this.formatToggleContentFocused(item, itemAny);
        break;
        
      case 'section':
        processedText += this.formatSectionContent(item, itemAny);
        break;
        
      case 'list_item':
        processedText += this.formatListItemContent(item, itemAny);
        break;
        
      case 'highlight':
        processedText += this.formatHighlightContent(item, itemAny);
        break;
        
      case 'page':
      default:
        processedText += this.formatPageContent(item, itemAny);
        break;
    }
    
    console.log(`📝 PREPROCESSING COMPLETE:`);
    console.log(`   Processed length: ${processedText.length} chars`);
    console.log(`   Preview: "${processedText.substring(0, 200)}..."`);
    
    // Ensure content fits within context window
    return this.truncateToContextWindow(processedText);
  }

  // Format toggle content (original method)
  private formatToggleContent(item: NotionContent, itemAny: any): string {
    let text = `\n\n--- TOGGLE CONTENT ---\n`;
    text += `Source Page: ${itemAny.parentPage}\n`;
    text += `Toggle Title: ${itemAny.toggleTitle}\n`;
    text += `Content Type: Focused Learning Notes\n`;
    text += `Last edited: ${item.lastEdited}\n\n`;
    
    text += `CONTEXT: This content was extracted from a toggle block titled "${itemAny.toggleTitle}" `;
    text += `within the page "${itemAny.parentPage}". The toggle likely contains `;
    text += `structured notes, takeaways, or insights from a specific source.\n\n`;
    
    text += `TOGGLE CONTENT:\n`;
    text += `${this.cleanNotionContent(item.content)}\n`;
    
    return text;
  }

  // Format toggle content with hierarchical awareness
  private formatToggleContentFocused(item: NotionContent, itemAny: any): string {
    const isClosedToggle = itemAny.isClosedToggle || false;
    const extractionMethod = itemAny.extractionMethod || 'unknown';
    const toggleLevel = itemAny.toggleLevel || 'unknown';
    const categoryTitle = itemAny.categoryTitle || '';
    
    let text = `\n\n--- HIERARCHICAL TOGGLE ANALYSIS ---\n`;
    text += `🔽 Toggle: "${itemAny.toggleTitle}"\n`;
    text += `📁 Toggle Level: ${toggleLevel.toUpperCase()}\n`;
    
    if (categoryTitle) {
      text += `📂 Category: ${categoryTitle}\n`;
      text += `📄 Full Path: ${itemAny.parentPage} → ${categoryTitle} → ${itemAny.toggleTitle}\n`;
    } else {
      text += `📄 Source Page: ${itemAny.parentPage}\n`;
    }
    
    text += `🔧 Extraction Method: ${extractionMethod}\n`;
    text += `🔒 Toggle Status: ${isClosedToggle ? 'CLOSED/COLLAPSED' : 'OPEN/EXPANDED'}\n`;
    text += `📊 Content Length: ${item.content.length} characters\n`;
    text += `📅 Last Modified: ${item.lastEdited}\n\n`;
    
    // Level-specific context
    switch (toggleLevel) {
      case 'video':
        text += `🎬 VIDEO TOGGLE CONTEXT:\n`;
        text += `This is a video-specific toggle containing detailed notes from a single video or learning source.\n`;
        text += `It's nested under the "${categoryTitle}" category and contains focused, actionable content.\n\n`;
        break;
        
      case 'category':
        text += `📁 CATEGORY TOGGLE CONTEXT:\n`;
        text += `This is a high-level category toggle that organizes multiple video toggles or related content.\n`;
        text += `It provides overview information for the "${itemAny.toggleTitle}" category.\n\n`;
        break;
        
      case 'direct':
        text += `📄 DIRECT TOGGLE CONTEXT:\n`;
        text += `This is a standalone toggle with direct content, not part of a hierarchical structure.\n\n`;
        break;
        
      default:
        text += `🔽 TOGGLE CONTEXT:\n`;
        text += `This toggle contains organized content under the heading "${itemAny.toggleTitle}".\n\n`;
        break;
    }
    
    if (isClosedToggle) {
      text += `⚠️  CLOSED TOGGLE NOTICE:\n`;
      if (toggleLevel === 'video') {
        text += `This video toggle is currently closed. The content below is a smart placeholder.\n`;
        text += `To access the actual video notes (bullet points, insights, action items):\n`;
        text += `1. Open "${itemAny.parentPage}" in Notion\n`;
        text += `2. Expand the "${categoryTitle}" category toggle\n`;
        text += `3. Expand the "${itemAny.toggleTitle}" video toggle\n`;
      } else {
        text += `This toggle is currently closed. The content below is a smart placeholder.\n`;
        text += `Expand the toggle in Notion to access the actual content.\n`;
      }
      text += `\n`;
    } else {
      text += `✅ OPEN TOGGLE:\n`;
      text += `The content below represents the actual notes and information stored in this toggle.\n\n`;
    }
    
    text += `📋 CONTENT ANALYSIS:\n`;
    if (toggleLevel === 'video') {
      text += `This content comes from a SINGLE VIDEO TOGGLE with focused learning notes.\n`;
      text += `The notes are organized under the video title "${itemAny.toggleTitle}" within the\n`;
      text += `"${categoryTitle}" category. This represents curated insights from one specific source.\n\n`;
    } else {
      text += `This content comes from a SINGLE TOGGLE titled "${itemAny.toggleTitle}".\n`;
      text += `It represents organized information under this specific heading.\n\n`;
    }
    
    text += `--- BEGIN TOGGLE CONTENT ---\n`;
    text += `${this.cleanNotionContent(item.content)}\n`;
    text += `--- END TOGGLE CONTENT ---\n\n`;
    
    text += `🎯 SUMMARIZATION INSTRUCTIONS:\n`;
    text += `- This is content from ONE ${toggleLevel.toUpperCase()} toggle, not multiple sources\n`;
    text += `- The toggle title "${itemAny.toggleTitle}" should be the primary focus\n`;
    
    if (toggleLevel === 'video') {
      text += `- This is focused content from a single video/learning source\n`;
      text += `- Frame the summary as insights from this specific video\n`;
      text += `- Emphasize the actionable, curated nature of the video notes\n`;
    } else if (toggleLevel === 'category') {
      text += `- This is category-level content that may reference multiple videos\n`;
      text += `- Frame as an overview of the "${itemAny.toggleTitle}" category\n`;
    }
    
    text += `- Maintain the context that this is organized content under a single heading\n`;
    
    return text;
  }

  // Format section content
  private formatSectionContent(item: NotionContent, itemAny: any): string {
    let text = `\n\n--- SECTION CONTENT ---\n`;
    text += `Source Page: ${itemAny.parentPage}\n`;
    text += `Section Title: ${itemAny.sectionTitle}\n`;
    text += `Content Type: Structured Document Section\n`;
    text += `Last edited: ${item.lastEdited}\n\n`;
    
    text += `CONTEXT: This content represents a section from a structured document. `;
    text += `The section "${itemAny.sectionTitle}" contains organized information `;
    text += `that was grouped under this heading within the larger document.\n\n`;
    
    text += `SECTION CONTENT:\n`;
    text += `${this.cleanNotionContent(item.content)}\n`;
    
    return text;
  }

  // Format list item content
  private formatListItemContent(item: NotionContent, itemAny: any): string {
    let text = `\n\n--- LIST ITEM CONTENT ---\n`;
    text += `Source Page: ${itemAny.parentPage}\n`;
    text += `List Type: ${itemAny.listType}\n`;
    
    if (itemAny.listType === 'to_do') {
      text += `Task Status: ${itemAny.isCompleted ? 'Completed' : 'Pending'}\n`;
    }
    
    text += `Content Type: Individual List Item\n`;
    text += `Last edited: ${item.lastEdited}\n\n`;
    
    text += `CONTEXT: This is an individual item from a list structure. `;
    text += `It represents a discrete piece of information, task, or point `;
    text += `that was part of a larger organized list.\n\n`;
    
    text += `LIST ITEM CONTENT:\n`;
    text += `${this.cleanNotionContent(item.content)}\n`;
    
    return text;
  }

  // Format highlight content (callouts, quotes)
  private formatHighlightContent(item: NotionContent, itemAny: any): string {
    let text = `\n\n--- HIGHLIGHTED CONTENT ---\n`;
    text += `Source Page: ${itemAny.parentPage}\n`;
    text += `Highlight Type: ${item.type === 'callout' ? 'Callout' : 'Quote'}\n`;
    text += `Content Type: Important Highlighted Information\n`;
    text += `Last edited: ${item.lastEdited}\n\n`;
    
    text += `CONTEXT: This content was specifically highlighted or called out `;
    text += `within the original document, indicating its importance or special significance. `;
    text += `${item.type === 'callout' ? 'Callouts often contain warnings, tips, or key insights.' : 'Quotes typically contain important statements or references.'}\n\n`;
    
    text += `HIGHLIGHTED CONTENT:\n`;
    text += `${this.cleanNotionContent(item.content)}\n`;
    
    return text;
  }

  // Format full page content
  private formatPageContent(item: NotionContent, itemAny: any): string {
    let text = `\n\n--- ${item.type.toUpperCase()}: ${item.title} ---\n`;
    text += `Content Type: Full Page Content\n`;
    text += `Last edited: ${item.lastEdited}\n`;
    
    // Add content structure information if available
    if (itemAny.contentStructure) {
      const structure = itemAny.contentStructure;
      text += `Content Structure: ${structure.primaryContentType} (${structure.contentDensity} density)\n`;
      text += `Blocks: ${structure.totalBlocks} total, ${structure.headingCount} headings, ${structure.listItemCount} list items\n`;
    }
    
    text += `\n`;
    
    // Clean and format content
    const cleanContent = this.cleanNotionContent(item.content);
    text += cleanContent;
    
    // Add properties if available (for databases)
    if (item.properties) {
      text += '\nProperties:\n';
      Object.entries(item.properties).forEach(([key, value]) => {
        text += `- ${key}: ${this.formatProperty(value)}\n`;
      });
    }
    
    return text;
  }

  /**
   * Generate summary using Gemini AI
   */
  private async generateSummaryWithAI(
    content: string,
    options: SummaryOptions,
    isRepetition: boolean = false,
    previousSummaries: string[] = []
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(options.style, isRepetition);
    const userPrompt = this.buildSummaryPrompt(content, options, isRepetition, previousSummaries);
    
    // Combine system and user prompts for Gemini
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    try {
      const result = await getModel('pro').generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: this.getMaxTokensForLength(options.length),
        },
      });

      const response = await result.response;
      return response.text() || '';
    } catch (error: any) {
      console.error('Gemini AI summarization failed:', error);
      // Retry with flash on quota/429
      const isQuota = typeof error?.message === 'string' && (error.message.includes('429') || error.message.toLowerCase().includes('quota'));
      if (isQuota) {
        try {
          const fallback = await getModel('flash').generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: this.getMaxTokensForLength(options.length),
            },
          });
          const fbResp = await fallback.response;
          return fbResp.text() || '';
        } catch (fbErr) {
          console.error('Gemini fallback (flash) summarization failed:', fbErr);
        }
      }
      throw new Error('Failed to generate summary with Gemini AI');
    }
  }

  /**
   * Extract action items using Gemini AI
   */
  private async extractActionItems(content: string): Promise<ActionItem[]> {
    const prompt = `You are an expert at identifying actionable items from text. Always return valid JSON.

Analyze the following content and extract actionable items. For each item, determine:
1. The specific action required
2. Priority level (high/medium/low)
3. Category (task, follow-up, research, etc.)
4. Any due dates mentioned

Content:
${content}

Return ONLY a JSON object with format:
{"actions": [{"text": "action", "priority": "high", "category": "task", "dueDate": "2024-01-15"}]}`;

    try {
      const result = await getModel('flash').generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        },
      });

      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in action items response');
        return [];
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return (parsed.actions || []).map((item: any, index: number) => ({
        id: `action_${index}_${Date.now()}`,
        text: item.text,
        priority: item.priority || 'medium',
        dueDate: item.dueDate,
        category: item.category || 'task',
        completed: false,
      }));
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return [];
    }
  }

  /**
   * Extract key insights using Gemini AI
   */
  private async extractKeyInsights(content: string): Promise<string[]> {
    const prompt = `Extract key insights and return them as a JSON object with an "insights" array.

Analyze the following content and identify the most important insights, patterns, or key takeaways. Focus on:
1. Important decisions made
2. Key learnings or discoveries
3. Significant patterns or trends
4. Critical information that stands out

Content:
${content}

Return ONLY a JSON object with format:
{"insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]}`;

    try {
      const result = await getModel('flash').generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      });

      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in insights response');
        return [];
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.insights || [];
    } catch (error) {
      console.error('Failed to extract insights:', error);
      return [];
    }
  }

  /**
   * Build the main summary prompt with universal content type awareness and repetition handling
   */
  private buildSummaryPrompt(
    content: string, 
    options: SummaryOptions, 
    isRepetition: boolean = false, 
    previousSummaries: string[] = []
  ): string {
    // Detect content type
    const contentType = this.detectContentType(content);
    
    // Enhanced detection for single toggle analysis
    const isSingleToggle = content.includes('--- SINGLE TOGGLE ANALYSIS ---');
    const isClosedToggle = content.includes('Toggle Status: CLOSED/COLLAPSED');
    
    let prompt = isRepetition 
      ? `🔄 REPETITION MODE: Please analyze and provide a FRESH PERSPECTIVE on the following Notion content that has been summarized before:\n\n${content}\n\n`
      : `Please analyze and summarize the following Notion content:\n\n${content}\n\n`;
    
    // Add previous summaries context for repetition mode
    if (isRepetition && previousSummaries.length > 0) {
      prompt += `📚 PREVIOUS SUMMARIES FOR CONTEXT (DO NOT REPEAT THESE APPROACHES):\n\n`;
      previousSummaries.forEach((summary, index) => {
        prompt += `--- Previous Summary ${index + 1} ---\n${summary.substring(0, 500)}${summary.length > 500 ? '...' : ''}\n\n`;
      });
      prompt += `🎯 YOUR TASK: Provide a completely different perspective, angle, or focus than the above summaries.\n\n`;
    }
    
    // Add enhanced instructions for single toggle content
    if (isSingleToggle) {
      prompt += `🎯 CRITICAL CONTEXT: SINGLE TOGGLE ANALYSIS
This content comes from ONE INDIVIDUAL TOGGLE, not multiple sources or documents.

KEY INSTRUCTIONS:
- The toggle title is the primary organizing theme
- Even if content covers multiple topics, they are subtopics within this single toggle
- Frame your summary around the toggle title as the main context
- If content seems diverse, present it as "curated insights within [toggle title]"
- Do NOT suggest this content comes from multiple sources
- Emphasize the unified, organized nature of this content collection

${isClosedToggle ? `
⚠️  CLOSED TOGGLE NOTICE:
This toggle is currently closed/collapsed in Notion. The content below may be a smart placeholder
generated from the toggle title. Frame your summary accordingly and mention the need to expand
the toggle for complete content access.
` : ''}

`;
    }
    
    // Add content-type specific instructions
    prompt += this.getContentTypeInstructions(contentType);
    
    prompt += `Summary Requirements:
- Style: ${options.style}
- Length: ${options.length}
- Focus areas: ${options.focus.join(', ')}
${options.includeActionItems ? '- Include action items section' : ''}
${options.includePriority ? '- Indicate priority/urgency level' : ''}

${this.getContentTypeGuidance(contentType)}

${isSingleToggle ? `
🎯 SINGLE TOGGLE SUMMARY GUIDELINES:
- Start your summary by acknowledging this is from the specific toggle
- Use phrases like "Within the [toggle title] toggle..." or "This curated collection focuses on..."
- If multiple topics appear, frame them as "key themes within this toggle include..."
- Maintain the context that this is organized, curated content under one heading
- End with guidance specific to this single toggle's content
` : ''}`;

    return prompt;
  }

  // Detect the type of content being processed
  private detectContentType(content: string): string {
    if (content.includes('--- HIERARCHICAL TOGGLE ANALYSIS ---')) return 'hierarchical_toggle';
    if (content.includes('--- SINGLE TOGGLE ANALYSIS ---')) return 'toggle';
    if (content.includes('--- TOGGLE CONTENT ---')) return 'toggle';
    if (content.includes('--- SECTION CONTENT ---')) return 'section';
    if (content.includes('--- LIST ITEM CONTENT ---')) return 'list_item';
    if (content.includes('--- HIGHLIGHTED CONTENT ---')) return 'highlight';
    return 'page';
  }

  // Get content-type specific instructions
  private getContentTypeInstructions(contentType: string): string {
    const instructions = {
      hierarchical_toggle: `CONTENT TYPE: This is content from a hierarchical toggle structure with category and video-level organization.

HIERARCHICAL TOGGLE ANALYSIS INSTRUCTIONS:
- CRITICAL: Recognize the toggle hierarchy (Category → Video → Content)
- VIDEO TOGGLES: Contain focused notes from specific videos/sources with bullet points and insights
- CATEGORY TOGGLES: Provide overview information organizing multiple video toggles
- Frame video content as "insights from [video title] within [category]"
- Emphasize the focused, curated nature of video-specific notes
- For video toggles, highlight actionable takeaways and key learning points
- For category toggles, provide organizational context and overview
- Maintain the hierarchical structure in your summary
- Use language like "From the video toggle..." or "Within the [category] category..."

`,

      toggle: `CONTENT TYPE: This is focused content from a SINGLE toggle block, representing curated notes organized under one heading.

TOGGLE-SPECIFIC ANALYSIS INSTRUCTIONS:
- CRITICAL: This is content from ONE toggle, not multiple sources
- The toggle title is the primary organizing theme and context
- Even if content covers multiple topics, frame them as related themes within this single toggle
- Use language like "Within this toggle..." or "This curated collection includes..."
- If content seems diverse, present it as organized subtopics under the main toggle heading
- Recognize this as the user's intentional organization of related information
- Focus on the toggle title as the unifying context for all content
- Emphasize that this represents curated, organized insights under one heading
- Structure your summary to honor the single-source, organized nature of the content

`,

      section: `CONTENT TYPE: This is a structured section from a document, organized under a specific heading.

SECTION-SPECIFIC ANALYSIS INSTRUCTIONS:
- Recognize this as part of a larger, organized document structure
- The section title indicates the specific topic or theme of this content
- Focus on the main points and key information within this section
- Consider how this section might relate to the broader document context
- Emphasize the structured, organized nature of the information
- Use language like "In the [section title] section..." or "This section covers..."

`,

      list_collection: `CONTENT TYPE: This is a collection of related list items (bullet points, numbered items, or tasks).

LIST COLLECTION ANALYSIS INSTRUCTIONS:
- Recognize this as a curated collection of related points or tasks
- The list type (bullets, numbers, tasks) indicates the organizational intent
- Focus on the collective meaning and patterns within the list
- For task lists, pay attention to completion status and priorities
- Emphasize the systematic, organized approach to information
- Use language like "This collection of [list type] includes..." or "The task list covers..."

`,

      list_item: `CONTENT TYPE: This is an individual item from a list structure (bullet point, task, or numbered item).

LIST ITEM ANALYSIS INSTRUCTIONS:
- Treat this as a discrete, focused piece of information
- If it's a task item, pay attention to completion status and actionability
- Consider the context of why this item was listed separately
- Focus on the specific value or action represented by this item
- Emphasize clarity and actionability in your summary
- Use language like "This task item..." or "This key point..."

`,

      highlight: `CONTENT TYPE: This is highlighted or specially called-out content (callout or quote).

HIGHLIGHT ANALYSIS INSTRUCTIONS:
- Recognize that this content was specifically emphasized in the original document
- Callouts often contain important warnings, tips, insights, or key information
- Quotes typically contain significant statements, references, or important thoughts
- Focus on why this content was highlighted and its special significance
- Emphasize the key message or insight that warranted special attention
- Use language like "This highlighted insight..." or "The emphasized point..."

`,

      page: `CONTENT TYPE: This is full page content with potentially mixed content types and structures.

PAGE ANALYSIS INSTRUCTIONS:
- Analyze the overall structure and organization of the content
- Identify the main themes, topics, and key information
- Consider the relationships between different sections and elements
- Look for patterns in how information is organized and presented
- Adapt to the user's note-taking style (hierarchical, categorical, sequential, or freeform)
- Provide a comprehensive overview that captures the page's primary value
- Use language appropriate to the detected organization and note-taking style

`
    };

    return instructions[contentType as keyof typeof instructions] || instructions.page;
  }

  // Get content-type specific guidance for summary generation
  private getContentTypeGuidance(contentType: string): string {
    const guidance = {
      toggle: 'For toggle content, provide a summary that honors the focused, curated nature of the notes while extracting maximum practical value.',
      section: 'For section content, provide a summary that captures the main points while acknowledging this is part of a larger structured document.',
      list_item: 'For list item content, provide a focused summary that emphasizes the specific value and actionability of this individual item.',
      highlight: 'For highlighted content, provide a summary that explains why this information was specially emphasized and its key significance.',
      page: 'For page content, provide a well-structured summary that captures the essence of the content while meeting the specified requirements.'
    };

    return guidance[contentType as keyof typeof guidance] || guidance.page;
  }

  /**
   * Get system prompt based on style with universal content type awareness and repetition handling
   */
  private getSystemPrompt(style: string, isRepetition: boolean = false): string {
    const basePrompts = {
      executive: 'You are an executive assistant creating concise, high-level summaries for busy professionals. Focus on key decisions, outcomes, and strategic points.',
      detailed: 'You are a research analyst creating comprehensive summaries that preserve important details while maintaining clarity and organization.',
      bullet_points: 'You are a note-taking specialist who organizes information into clear, scannable bullet points with logical hierarchy.',
      action_items: 'You are a productivity expert focused on extracting actionable items, next steps, and follow-ups from content.',
    };
    
    const basePrompt = basePrompts[style as keyof typeof basePrompts] || basePrompts.executive;
    
    // Add universal content type instructions
    const universalInstructions = `

UNIVERSAL CONTENT TYPE INSTRUCTIONS:

FOR TOGGLE CONTENT:
- CRITICAL: This is content from ONE SINGLE TOGGLE, not multiple sources
- The toggle title (e.g., "Career and Important Topic") is the organizing theme
- Even if content covers multiple subtopics, frame them as related themes within this single toggle
- Treat diverse content as a curated collection organized under one heading
- Focus on the toggle title as the primary context and organizing principle
- If content seems to cover multiple topics, present them as "subtopics within [toggle title]"
- Emphasize that this represents the user's organized collection of related insights

FOR SECTION CONTENT:
- Recognize as part of a larger structured document
- Focus on the main points within this specific section
- Consider the section's role in the broader document context
- Maintain the organized, structured approach

FOR LIST ITEM CONTENT:
- Treat as discrete, focused information or tasks
- Pay attention to completion status for task items
- Emphasize actionability and specific value
- Consider why this item was listed separately

FOR HIGHLIGHTED CONTENT:
- Recognize the special emphasis placed on this content
- Callouts often contain warnings, tips, or key insights
- Quotes contain significant statements or references
- Focus on why this content warranted special attention

FOR PAGE CONTENT:
- Analyze overall structure and organization
- Identify main themes and key information
- Consider relationships between different elements
- Provide comprehensive overview of the page's value

GENERAL PRINCIPLES:
- Always acknowledge the content type and structure in your analysis
- Adapt your summarization approach to match the content's natural organization
- Preserve the intent and emphasis of the original content structure
- Extract maximum value appropriate to each content type`;

    // Add repetition-specific instructions if this is a repeated summary
    const repetitionInstructions = isRepetition ? `

🔄 REPETITION MODE INSTRUCTIONS:

CRITICAL: This content has been summarized before. Your task is to provide a FRESH PERSPECTIVE with a different angle or focus.

REPETITION GUIDELINES:
- DO NOT simply rewrite the previous summary
- Explore different aspects, themes, or angles of the same content
- Look for insights that might have been missed in previous summaries
- Consider alternative interpretations or applications
- Focus on different stakeholder perspectives (e.g., if previous was technical, try strategic)
- Highlight different time horizons (short-term vs long-term implications)
- Emphasize different domains (if content spans multiple areas)
- Consider different implementation approaches or use cases

FRESH PERSPECTIVE APPROACHES:
1. **Different Lens**: If previous summary was tactical, try strategic. If it was individual-focused, try team/organizational.
2. **Different Time Frame**: Focus on immediate actions vs long-term implications
3. **Different Audience**: Consider how this content applies to different roles or industries
4. **Different Application**: Explore alternative ways to implement or use these insights
5. **Different Context**: Consider how current events or trends might change the relevance
6. **Contrarian View**: What counterarguments or limitations should be considered?
7. **Integration Focus**: How does this connect to other knowledge areas or skills?

MAINTAIN QUALITY: While providing a fresh perspective, maintain the same high standards for:
- Actionable insights and takeaways
- Clear structure and organization  
- Practical implementation guidance
- Priority-based action items

The goal is to extract NEW VALUE from the same content by approaching it from a different angle.` : '';

    return basePrompt + universalInstructions + repetitionInstructions;
  }

  /**
   * Utility functions
   */
  private cleanNotionContent(content: string): string {
    return content
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/[#*`]/g, '') // Remove markdown formatting
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private formatProperty(value: any): string {
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'object' ? v.name || v.title || JSON.stringify(v) : v).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return value.name || value.title || JSON.stringify(value);
    }
    return String(value);
  }

  private truncateToContextWindow(content: string): string {
    const maxChars = this.CONTEXT_WINDOW * 3; // Rough estimate: 1 token ≈ 3 characters
    if (content.length <= maxChars) return content;
    
    return content.substring(0, maxChars) + '\n\n... [Content truncated for processing] ...';
  }

  private getMaxTokensForLength(length: string): number {
    const tokenLimits = { short: 300, medium: 600, long: 1000 };
    return tokenLimits[length as keyof typeof tokenLimits] || 600;
  }

  private determinePriority(summary: string, actionItems: ActionItem[]): 'high' | 'medium' | 'low' {
    const highPriorityKeywords = ['urgent', 'critical', 'important', 'deadline', 'asap'];
    const hasHighPriorityActions = actionItems.some(item => item.priority === 'high');
    const hasUrgentKeywords = highPriorityKeywords.some(keyword => 
      summary.toLowerCase().includes(keyword)
    );
    
    if (hasHighPriorityActions || hasUrgentKeywords) return 'high';
    if (actionItems.length > 3) return 'medium';
    return 'low';
  }

  private generateTags(content: NotionContent[], summary: string): string[] {
    // Simple tag generation logic - can be enhanced with NLP
    const tags = new Set<string>();
    
    // Add tags based on content types
    content.forEach(item => {
      if (item.type === 'database') tags.add('database');
      if (item.title.toLowerCase().includes('meeting')) tags.add('meeting');
      if (item.title.toLowerCase().includes('project')) tags.add('project');
    });
    
    // Add tags based on summary content
    const commonTags = ['tasks', 'ideas', 'decisions', 'follow-up', 'research'];
    commonTags.forEach(tag => {
      if (summary.toLowerCase().includes(tag)) tags.add(tag);
    });
    
    return Array.from(tags).slice(0, 5); // Limit to 5 tags
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = this.countWords(text);
    return Math.ceil(words / wordsPerMinute);
  }

  private generateId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const aiSummarizationService = new AISummarizationService();
