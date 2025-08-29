// Notion OAuth Integration
// This follows the same pattern as Zapier, Make.com, and other SaaS platforms

export interface NotionOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person: {
        email: string;
      };
    };
  };
}

export class NotionOAuthService {
  private config: NotionOAuthConfig;

  constructor(config: NotionOAuthConfig) {
    this.config = config;
  }

  // Generate the OAuth authorization URL
  generateAuthUrl(state?: string): string {
    console.log('NotionOAuth: generateAuthUrl called with state:', !!state);
    console.log('NotionOAuth: Config check:', {
      hasClientId: !!this.config.clientId,
      hasClientSecret: !!this.config.clientSecret,
      hasRedirectUri: !!this.config.redirectUri,
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri
    });

    if (!this.config.clientId) {
      const error = 'Missing Notion Client ID - check your environment variables';
      console.error('NotionOAuth:', error);
      throw new Error(error);
    }

    if (!this.config.redirectUri) {
      const error = 'Missing redirect URI - check your environment variables';
      console.error('NotionOAuth:', error);
      throw new Error(error);
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    console.log('NotionOAuth: Generated auth URL:', authUrl);
    console.log('NotionOAuth: URL parameters:', Object.fromEntries(params));
    
    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<NotionTokenResponse> {
    console.log('NotionOAuth: Exchanging code for token...');
    console.log('NotionOAuth: Using redirect URI:', this.config.redirectUri);
    console.log('NotionOAuth: Using client ID:', this.config.clientId);
    console.log('NotionOAuth: Environment:', import.meta.env.MODE);
    
    // Validate inputs
    if (!code) {
      throw new Error('Authorization code is required');
    }
    
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Notion OAuth credentials are not configured');
    }
    
    try {
      const requestBody = {
        grant_type: 'authorization_code',
        code: code.trim(), // Remove any whitespace
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      };
      
      console.log('NotionOAuth: Request body:', { 
        ...requestBody, 
        code: '[REDACTED]', 
        client_secret: '[REDACTED]' 
      });
      
      // Always use serverless function to avoid CORS issues
      const apiUrl = '/api/notion-token';
      console.log('NotionOAuth: Using serverless function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('NotionOAuth: Response status:', response.status);
      console.log('NotionOAuth: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NotionOAuth: Token exchange failed:', errorText);
        
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: 'Unknown error', error_description: errorText };
        }
        
        // Handle specific error cases
        if (error.error === 'invalid_grant') {
          throw new Error('Authorization code expired or already used. Please try connecting again.');
        }
        
        if (error.error === 'invalid_client') {
          throw new Error('Invalid client credentials. Please check your Notion app configuration.');
        }
        
        if (error.error === 'invalid_request') {
          throw new Error('Invalid request. Please try connecting again.');
        }
        
        if (error.error === 'duplicate_request') {
          throw new Error('Connection request already in progress. Please wait and try again.');
        }
        
        throw new Error(error.error_description || error.error || 'Token exchange failed');
      }

      const tokenData = await response.json();
      console.log('NotionOAuth: Token exchange successful');
      
      // Validate the response structure
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access token');
      }
      
      return tokenData;
      
    } catch (error: any) {
      console.error('NotionOAuth: Token exchange error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }

  // Get user's Notion pages and databases
  async getUserContent(accessToken: string) {
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Notion content');
    }

    return response.json();
  }

  // Get specific page content
  async getPageContent(pageId: string, accessToken: string) {
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch page content');
    }

    return response.json();
  }

  // Get page properties and metadata
  async getPageDetails(pageId: string, accessToken: string) {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch page details');
    }

    return response.json();
  }

  // Extract readable text from Notion blocks
  private extractTextFromBlocks(blocks: any[]): string {
    let text = '';
    
    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
          text += this.extractRichText(block.paragraph?.rich_text || []) + '\n\n';
          break;
        case 'heading_1':
          text += '# ' + this.extractRichText(block.heading_1?.rich_text || []) + '\n\n';
          break;
        case 'heading_2':
          text += '## ' + this.extractRichText(block.heading_2?.rich_text || []) + '\n\n';
          break;
        case 'heading_3':
          text += '### ' + this.extractRichText(block.heading_3?.rich_text || []) + '\n\n';
          break;
        case 'bulleted_list_item':
          text += '• ' + this.extractRichText(block.bulleted_list_item?.rich_text || []) + '\n';
          break;
        case 'numbered_list_item':
          text += '1. ' + this.extractRichText(block.numbered_list_item?.rich_text || []) + '\n';
          break;
        case 'to_do':
          const checked = block.to_do?.checked ? '[x]' : '[ ]';
          text += `${checked} ${this.extractRichText(block.to_do?.rich_text || [])}\n`;
          break;
        case 'quote':
          text += '> ' + this.extractRichText(block.quote?.rich_text || []) + '\n\n';
          break;
        case 'callout':
          text += '📝 ' + this.extractRichText(block.callout?.rich_text || []) + '\n\n';
          break;
        case 'code':
          text += '```\n' + this.extractRichText(block.code?.rich_text || []) + '\n```\n\n';
          break;
        case 'divider':
          text += '---\n\n';
          break;
        case 'toggle':
          // Handle toggle blocks (collapsible content)
          const toggleTitle = this.extractRichText(block.toggle?.rich_text || []);
          text += `🔽 ${toggleTitle}\n`;
          // Get children blocks if they exist
          if (block.has_children) {
            text += '  [Toggle content available - needs expansion]\n\n';
          }
          break;
      }
    }
    
    return text.trim();
  }

  private extractRichText(richText: any[]): string {
    return richText.map(text => text.plain_text || '').join('');
  }

  // Get content suitable for AI processing with comprehensive content extraction
  async getContentForAI(accessToken: string, lastDays: number = 7): Promise<any[]> {
    console.log('NotionOAuth: Fetching content for AI processing...');
    
    try {
      // Use serverless function to avoid CORS issues
      const searchResponse = await fetch('/api/notion-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          filter: {
            property: 'object',
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 30 // Increased for better content discovery
        }),
      });

      if (!searchResponse.ok) {
        throw new Error('Failed to search Notion content');
      }

      const searchData = await searchResponse.json();
      let recentPages = searchData.results.filter((page: any) => {
        const lastEdited = new Date(page.last_edited_time);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lastDays);
        return lastEdited >= cutoffDate;
      });

      console.log(`Found ${recentPages.length} recent pages to process`);

      // If no recent pages, use all available pages (more lenient)
      if (recentPages.length === 0) {
        console.log('No recent pages found, using all available pages');
        recentPages = searchData.results.slice(0, 15);
      }

      // Process each page to extract content with comprehensive analysis
      const contentItems = [];
      
      for (const page of recentPages.slice(0, 15)) { // Process more pages for content discovery
        try {
          // Get page details using serverless function
          const pageDetailsResponse = await fetch('/api/notion-page-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, pageId: page.id }),
          });
          
          if (!pageDetailsResponse.ok) {
            console.warn(`Failed to get page details for ${page.id}`);
            continue;
          }
          
          const pageDetails = await pageDetailsResponse.json();
          
          // Get page content blocks using serverless function
          const contentResponse = await fetch('/api/notion-page-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, pageId: page.id }),
          });
          
          if (!contentResponse.ok) {
            console.warn(`Failed to get page content for ${page.id}`);
            continue;
          }
          
          const contentData = await contentResponse.json();
          
          // Extract title
          const title = this.extractPageTitle(pageDetails);
          
          // TRY ENHANCED EXTRACTION FIRST, FALLBACK TO SIMPLE
          let extractedContent = [];
          
          try {
            // ENHANCED: Multi-type content extraction
            extractedContent = await this.extractAllContentTypes(
              contentData.results || [], 
              accessToken, 
              title, 
              page.id,
              page.last_edited_time,
              page.url,
              pageDetails.properties
            );
          } catch (error) {
            console.warn(`Enhanced extraction failed for "${title}", trying simple extraction:`, error);
          }
          
          // FALLBACK: Simple extraction if enhanced fails
          if (extractedContent.length === 0) {
            const simpleContent = this.extractSimplePageContent(
              contentData.results || [],
              title,
              page.id,
              page.last_edited_time,
              page.url,
              pageDetails.properties
            );
            
            if (simpleContent) {
              extractedContent = [simpleContent];
              console.log(`✅ Simple extraction successful for "${title}"`);
            }
          }
          
          contentItems.push(...extractedContent);
          
          if (extractedContent.length > 0) {
            console.log(`Processed page "${title}" with ${extractedContent.length} content items`);
          }
        } catch (error) {
          console.warn(`Failed to process page ${page.id}:`, error);
          continue;
        }
      }
      
      // Final validation: ensure all items have required properties (more lenient)
      const validatedItems = contentItems.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('Invalid item (not an object):', item);
          return false;
        }
        if (!item.content || typeof item.content !== 'string' || item.content.trim().length < 10) {
          console.warn('Item missing or insufficient content:', item.title || 'Untitled', `(${item.content?.length || 0} chars)`);
          return false;
        }
        if (!item.title) {
          item.title = 'Untitled';
        }
        if (!item.id) {
          item.id = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return true;
      });
      
      console.log(`Total content items extracted: ${validatedItems.length} (validated from ${contentItems.length})`);
      return validatedItems;
    } catch (error) {
      console.error('NotionOAuth: Error fetching content for AI:', error);
      throw error;
    }
  }

  // ADAPTIVE: Extract all types of content with intelligent pattern recognition
  private async extractAllContentTypes(
    blocks: any[], 
    accessToken: string, 
    pageTitle: string,
    pageId: string,
    lastEdited: string,
    url: string,
    properties: any
  ): Promise<any[]> {
    const contentItems = [];
    
    console.log(`🔍 ADAPTIVE EXTRACTION: Analyzing page structure for "${pageTitle}"`);
    
    // Step 1: Deep structural analysis
    const pageAnalysis = this.analyzePageStructureAdaptive(blocks, pageTitle);
    
    console.log(`📊 Page Analysis Results:`, {
      primaryPattern: pageAnalysis.primaryPattern,
      contentDensity: pageAnalysis.contentDensity,
      structureComplexity: pageAnalysis.structureComplexity,
      dominantContentType: pageAnalysis.dominantContentType,
      organizationStyle: pageAnalysis.organizationStyle,
      noteStyle: pageAnalysis.noteStyle
    });
    
    // Step 2: Pattern-based extraction strategies
    const extractionStrategies = this.determineExtractionStrategies(pageAnalysis);
    
    console.log(`🎯 Selected Extraction Strategies:`, extractionStrategies.map(s => s.name));
    
    // Step 3: Execute adaptive extraction based on detected patterns
    for (const strategy of extractionStrategies) {
      console.log(`🔧 Executing strategy: ${strategy.name}`);
      
      try {
        switch (strategy.type) {
          case 'hierarchical_toggles':
            const hierarchicalItems = await this.extractHierarchicalToggles(blocks, accessToken, pageTitle);
            if (hierarchicalItems.length > 0) {
              contentItems.push(...hierarchicalItems);
              console.log(`  ✅ Extracted ${hierarchicalItems.length} hierarchical toggle items`);
              return contentItems; // Success, return early
            }
            break;
            
          case 'flat_toggles':
            const flatToggleItems = await this.extractFlatToggles(blocks, accessToken, pageTitle);
            if (flatToggleItems.length > 0) {
              contentItems.push(...flatToggleItems);
              console.log(`  ✅ Extracted ${flatToggleItems.length} flat toggle items`);
              return contentItems;
            }
            break;
            
          case 'structured_sections':
            const sectionItems = this.extractStructuredSections(blocks, pageTitle, pageId, lastEdited, url);
            if (sectionItems.length > 0) {
              contentItems.push(...sectionItems);
              console.log(`  ✅ Extracted ${sectionItems.length} structured sections`);
              return contentItems;
            }
            break;
            
          case 'list_collections':
            const listCollections = this.extractListCollections(blocks, pageTitle, pageId, lastEdited, url);
            if (listCollections.length > 0) {
              contentItems.push(...listCollections);
              console.log(`  ✅ Extracted ${listCollections.length} list collections`);
              return contentItems;
            }
            break;
            
          case 'individual_lists':
            const individualLists = this.extractIndividualListItems(blocks, pageTitle, pageId, lastEdited, url);
            if (individualLists.length > 0) {
              contentItems.push(...individualLists);
              console.log(`  ✅ Extracted ${individualLists.length} individual list items`);
              return contentItems;
            }
            break;
            
          case 'highlight_blocks':
            const highlightItems = this.extractHighlightBlocks(blocks, pageTitle, pageId, lastEdited, url);
            if (highlightItems.length > 0) {
              contentItems.push(...highlightItems);
              console.log(`  ✅ Extracted ${highlightItems.length} highlight blocks`);
              return contentItems;
            }
            break;
            
          case 'mixed_content':
            const mixedItems = await this.extractMixedContent(blocks, accessToken, pageTitle, pageId, lastEdited, url);
            if (mixedItems.length > 0) {
              contentItems.push(...mixedItems);
              console.log(`  ✅ Extracted ${mixedItems.length} mixed content items`);
              return contentItems;
            }
            break;
            
          case 'full_page':
            const pageItem = this.extractFullPageContent(blocks, pageTitle, pageId, lastEdited, url, properties, pageAnalysis);
            if (pageItem) {
              contentItems.push(pageItem);
              console.log(`  ✅ Extracted full page content`);
              return contentItems;
            }
            break;
        }
      } catch (error) {
        console.warn(`  ⚠️ Strategy ${strategy.name} failed:`, error);
        continue; // Try next strategy
      }
    }
    
    console.log(`🎯 ADAPTIVE EXTRACTION COMPLETE: ${contentItems.length} total items extracted`);
    return contentItems;
  }

  // Advanced page structure analysis with pattern recognition
  private analyzePageStructureAdaptive(blocks: any[], pageTitle: string) {
    const analysis = {
      totalBlocks: blocks.length,
      
      // Block type counts
      toggleCount: 0,
      togglesWithChildren: 0,
      toggleDepthLevels: new Set(),
      headingCount: 0,
      headingLevels: { h1: 0, h2: 0, h3: 0 },
      listItemCount: 0,
      listTypes: { bulleted: 0, numbered: 0, todo: 0 },
      calloutCount: 0,
      quoteCount: 0,
      codeBlockCount: 0,
      paragraphCount: 0,
      
      // Content patterns
      hasNestedToggles: false,
      hasConsistentHeadings: false,
      hasListClusters: false,
      hasHighlightBlocks: false,
      hasMixedContent: false,
      
      // Structure analysis
      primaryPattern: 'unknown' as 'hierarchical_toggles' | 'flat_toggles' | 'structured_headings' | 'list_heavy' | 'highlight_focused' | 'mixed' | 'simple' | 'unknown',
      contentDensity: 'low' as 'low' | 'medium' | 'high',
      structureComplexity: 'simple' as 'simple' | 'moderate' | 'complex',
      dominantContentType: 'mixed' as 'toggles' | 'headings' | 'lists' | 'highlights' | 'paragraphs' | 'mixed',
      
      // User style indicators
      organizationStyle: 'unknown' as 'hierarchical' | 'categorical' | 'sequential' | 'freeform' | 'unknown',
      noteStyle: 'unknown' as 'detailed' | 'bullet_points' | 'structured' | 'casual' | 'unknown',
      
      // Content quality metrics
      averageBlockLength: 0,
      contentRichness: 0,
      structuralConsistency: 0,
    };
    
    let totalTextLength = 0;
    const blockLengths: number[] = [];
    
    // Analyze each block
    blocks.forEach((block, index) => {
      const blockText = this.extractTextFromBlocks([block]);
      blockLengths.push(blockText.length);
      totalTextLength += blockText.length;
      
      switch (block.type) {
        case 'toggle':
          analysis.toggleCount++;
          if (block.has_children) {
            analysis.togglesWithChildren++;
          }
          // Detect nesting by checking if previous blocks were also toggles
          const prevToggleCount = blocks.slice(0, index).filter(b => b.type === 'toggle').length;
          if (prevToggleCount > 0) {
            analysis.hasNestedToggles = true;
          }
          break;
          
        case 'heading_1':
          analysis.headingCount++;
          analysis.headingLevels.h1++;
          break;
        case 'heading_2':
          analysis.headingCount++;
          analysis.headingLevels.h2++;
          break;
        case 'heading_3':
          analysis.headingCount++;
          analysis.headingLevels.h3++;
          break;
          
        case 'bulleted_list_item':
          analysis.listItemCount++;
          analysis.listTypes.bulleted++;
          break;
        case 'numbered_list_item':
          analysis.listItemCount++;
          analysis.listTypes.numbered++;
          break;
        case 'to_do':
          analysis.listItemCount++;
          analysis.listTypes.todo++;
          break;
          
        case 'callout':
          analysis.calloutCount++;
          analysis.hasHighlightBlocks = true;
          break;
        case 'quote':
          analysis.quoteCount++;
          analysis.hasHighlightBlocks = true;
          break;
          
        case 'code':
          analysis.codeBlockCount++;
          break;
          
        case 'paragraph':
          analysis.paragraphCount++;
          break;
      }
    });
    
    // Calculate metrics
    analysis.averageBlockLength = blockLengths.length > 0 ? totalTextLength / blockLengths.length : 0;
    
    // Determine content density
    if (totalTextLength > 3000) analysis.contentDensity = 'high';
    else if (totalTextLength > 1000) analysis.contentDensity = 'medium';
    
    // Determine structure complexity
    const structureScore = analysis.toggleCount + analysis.headingCount + (analysis.listItemCount / 3);
    if (structureScore > 15) analysis.structureComplexity = 'complex';
    else if (structureScore > 5) analysis.structureComplexity = 'moderate';
    
    // Determine dominant content type
    const contentScores = {
      toggles: analysis.toggleCount * 2,
      headings: analysis.headingCount * 1.5,
      lists: analysis.listItemCount,
      highlights: (analysis.calloutCount + analysis.quoteCount) * 2,
      paragraphs: analysis.paragraphCount * 0.5
    };
    
    const maxScore = Math.max(...Object.values(contentScores));
    analysis.dominantContentType = Object.keys(contentScores).find(
      key => contentScores[key as keyof typeof contentScores] === maxScore
    ) as any || 'mixed';
    
    // ENHANCED: Determine primary pattern with better toggle detection
    console.log(`🔍 Pattern Analysis Debug:`, {
      toggleCount: analysis.toggleCount,
      togglesWithChildren: analysis.togglesWithChildren,
      headingCount: analysis.headingCount,
      listItemCount: analysis.listItemCount,
      totalBlocks: analysis.totalBlocks,
      pageTitle: pageTitle
    });
    
    // Check for hierarchical patterns (more lenient for closed toggles)
    if (analysis.toggleCount >= 2) {
      // If we have toggles and the page title suggests learning content, assume hierarchical
      const isLearningContent = pageTitle.toLowerCase().includes('youtube') || 
                               pageTitle.toLowerCase().includes('notes') ||
                               pageTitle.toLowerCase().includes('learning');
      
      if (isLearningContent || analysis.togglesWithChildren >= 1) {
        analysis.primaryPattern = 'hierarchical_toggles';
        analysis.organizationStyle = 'hierarchical';
        console.log(`🎯 Detected hierarchical toggles (learning content: ${isLearningContent})`);
      } else {
        analysis.primaryPattern = 'flat_toggles';
        analysis.organizationStyle = 'categorical';
        console.log(`🎯 Detected flat toggles`);
      }
    } else if (analysis.toggleCount >= 1 && analysis.toggleCount < 2) {
      // Single toggle - treat as flat
      analysis.primaryPattern = 'flat_toggles';
      analysis.organizationStyle = 'categorical';
      console.log(`🎯 Detected single toggle (flat)`);
    } else if (analysis.headingCount >= 3 && analysis.headingLevels.h2 >= 2) {
      analysis.primaryPattern = 'structured_headings';
      analysis.organizationStyle = 'sequential';
      console.log(`🎯 Detected structured headings`);
    } else if (analysis.listItemCount >= 5 && analysis.listItemCount > analysis.paragraphCount) {
      analysis.primaryPattern = 'list_heavy';
      analysis.noteStyle = 'bullet_points';
      console.log(`🎯 Detected list-heavy content`);
    } else if (analysis.hasHighlightBlocks && (analysis.calloutCount + analysis.quoteCount) >= 2) {
      analysis.primaryPattern = 'highlight_focused';
      analysis.noteStyle = 'structured';
      console.log(`🎯 Detected highlight-focused content`);
    } else if (analysis.totalBlocks >= 8) {
      analysis.primaryPattern = 'mixed';
      analysis.organizationStyle = 'freeform';
      console.log(`🎯 Detected mixed content`);
    } else {
      analysis.primaryPattern = 'simple';
      analysis.noteStyle = 'casual';
      console.log(`🎯 Detected simple content`);
    }
    
    // Determine note style
    if (analysis.noteStyle === 'unknown') {
      if (analysis.averageBlockLength > 200) {
        analysis.noteStyle = 'detailed';
      } else if (analysis.listItemCount > analysis.paragraphCount) {
        analysis.noteStyle = 'bullet_points';
      } else if (analysis.headingCount > 0) {
        analysis.noteStyle = 'structured';
      } else {
        analysis.noteStyle = 'casual';
      }
    }
    
    // Calculate content richness and structural consistency
    analysis.contentRichness = Math.min(100, (totalTextLength / 100) + (analysis.totalBlocks * 2));
    analysis.structuralConsistency = this.calculateStructuralConsistency(blocks);
    
    return analysis;
  }

  // Determine extraction strategies based on page analysis
  private determineExtractionStrategies(analysis: any): Array<{name: string, type: string, priority: number}> {
    const strategies = [];
    
    switch (analysis.primaryPattern) {
      case 'hierarchical_toggles':
        strategies.push({ name: 'Hierarchical Toggle Extraction', type: 'hierarchical_toggles', priority: 1 });
        if (analysis.hasHighlightBlocks) {
          strategies.push({ name: 'Highlight Block Extraction', type: 'highlight_blocks', priority: 2 });
        }
        break;
        
      case 'flat_toggles':
        strategies.push({ name: 'Flat Toggle Extraction', type: 'flat_toggles', priority: 1 });
        if (analysis.listItemCount > 3) {
          strategies.push({ name: 'List Collection Extraction', type: 'list_collections', priority: 2 });
        }
        break;
        
      case 'structured_headings':
        strategies.push({ name: 'Structured Section Extraction', type: 'structured_sections', priority: 1 });
        if (analysis.hasHighlightBlocks) {
          strategies.push({ name: 'Highlight Block Extraction', type: 'highlight_blocks', priority: 2 });
        }
        break;
        
      case 'list_heavy':
        if (analysis.structureComplexity === 'complex') {
          strategies.push({ name: 'List Collection Extraction', type: 'list_collections', priority: 1 });
        } else {
          strategies.push({ name: 'Individual List Extraction', type: 'individual_lists', priority: 1 });
        }
        break;
        
      case 'highlight_focused':
        strategies.push({ name: 'Highlight Block Extraction', type: 'highlight_blocks', priority: 1 });
        if (analysis.toggleCount > 0) {
          strategies.push({ name: 'Flat Toggle Extraction', type: 'flat_toggles', priority: 2 });
        }
        break;
        
      case 'mixed':
        strategies.push({ name: 'Mixed Content Extraction', type: 'mixed_content', priority: 1 });
        break;
        
      case 'simple':
      default:
        strategies.push({ name: 'Full Page Extraction', type: 'full_page', priority: 1 });
        break;
    }
    
    // Always add fallback strategy
    if (strategies.length === 1 && strategies[0].type !== 'full_page') {
      strategies.push({ name: 'Full Page Fallback', type: 'full_page', priority: 99 });
    }
    
    return strategies.sort((a, b) => a.priority - b.priority);
  }

  // Calculate structural consistency score
  private calculateStructuralConsistency(blocks: any[]): number {
    if (blocks.length < 3) return 50;
    
    const blockTypes = blocks.map(b => b.type);
    const typeFrequency: Record<string, number> = {};
    
    blockTypes.forEach(type => {
      typeFrequency[type] = (typeFrequency[type] || 0) + 1;
    });
    
    const dominantType = Object.keys(typeFrequency).reduce((a, b) => 
      typeFrequency[a] > typeFrequency[b] ? a : b
    );
    
    const consistency = (typeFrequency[dominantType] / blocks.length) * 100;
    return Math.round(consistency);
  }

  // Analyze page structure to determine best extraction strategy (LEGACY)
  private analyzePageStructure(blocks: any[], pageTitle: string) {
    const analysis = {
      totalBlocks: blocks.length,
      toggleCount: 0,
      togglesWithChildren: 0,
      headingCount: 0,
      listItemCount: 0,
      calloutCount: 0,
      codeBlockCount: 0,
      hasSignificantToggles: false,
      hasStructuredSections: false,
      hasSignificantLists: false,
      contentDensity: 'low' as 'low' | 'medium' | 'high',
      primaryContentType: 'mixed' as 'toggle' | 'structured' | 'list' | 'highlight' | 'mixed'
    };
    
    let totalTextLength = 0;
    
    for (const block of blocks) {
      switch (block.type) {
        case 'toggle':
          analysis.toggleCount++;
          if (block.has_children) {
            analysis.togglesWithChildren++;
          }
          break;
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          analysis.headingCount++;
          break;
        case 'bulleted_list_item':
        case 'numbered_list_item':
        case 'to_do':
          analysis.listItemCount++;
          break;
        case 'callout':
        case 'quote':
          analysis.calloutCount++;
          break;
        case 'code':
          analysis.codeBlockCount++;
          break;
        case 'paragraph':
          const text = this.extractRichText(block.paragraph?.rich_text || []);
          totalTextLength += text.length;
          break;
      }
    }
    
    // Enhanced toggle significance detection
    // Only consider toggles significant if they have children (actual content)
    analysis.hasSignificantToggles = analysis.togglesWithChildren >= 1 && 
                                    analysis.toggleCount >= 2 && 
                                    analysis.togglesWithChildren / analysis.toggleCount > 0.5; // At least 50% of toggles have content
    
    analysis.hasStructuredSections = analysis.headingCount >= 2 && analysis.headingCount / analysis.totalBlocks > 0.1;
    analysis.hasSignificantLists = analysis.listItemCount >= 3 && analysis.listItemCount / analysis.totalBlocks > 0.4;
    
    // Determine content density
    if (totalTextLength > 2000) analysis.contentDensity = 'high';
    else if (totalTextLength > 500) analysis.contentDensity = 'medium';
    
    // Determine primary content type with better toggle detection
    if (analysis.hasSignificantToggles) {
      analysis.primaryContentType = 'toggle';
    } else if (analysis.hasStructuredSections) {
      analysis.primaryContentType = 'structured';
    } else if (analysis.hasSignificantLists) {
      analysis.primaryContentType = 'list';
    } else if (analysis.calloutCount > 0) {
      analysis.primaryContentType = 'highlight';
    }
    
    console.log('Page structure analysis:', {
      totalBlocks: analysis.totalBlocks,
      toggleCount: analysis.toggleCount,
      togglesWithChildren: analysis.togglesWithChildren,
      hasSignificantToggles: analysis.hasSignificantToggles,
      primaryContentType: analysis.primaryContentType,
      contentDensity: analysis.contentDensity
    });
    
    return analysis;
  }

  // Extract hierarchical toggles - handles nested video toggles within category toggles
  private async extractHierarchicalToggles(blocks: any[], accessToken: string, pageTitle: string): Promise<any[]> {
    const toggleItems = [];
    
    console.log(`🔍 HIERARCHICAL EXTRACTION: Processing ${blocks.length} blocks for "${pageTitle}"`);
    
    for (const block of blocks) {
      if (block.type === 'toggle') {
        const toggleTitle = this.extractRichText(block.toggle?.rich_text || []);
        
        if (!toggleTitle.trim() || toggleTitle.trim().length < 2) {
          console.log(`  ❌ Skipping toggle with empty/short title: "${toggleTitle}"`);
          continue;
        }
        
        console.log(`  🔽 Processing toggle: "${toggleTitle}" (has_children: ${block.has_children})`);
        
        try {
          // CRITICAL: Always try to fetch children regardless of has_children flag
          // Closed toggles show has_children=false but may contain content
          console.log(`    📡 Fetching children for "${toggleTitle}" (ignoring has_children=${block.has_children})`);
          
          const childrenResponse = await fetch('/api/notion-block-children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, blockId: block.id }),
          });
          
          if (childrenResponse.ok) {
            const childrenData = await childrenResponse.json();
            const children = childrenData.results || [];
            
            console.log(`    📊 API returned ${children.length} children for "${toggleTitle}"`);
            
            if (children.length > 0) {
              // Look for nested toggles (video-level toggles)
              const nestedToggles = children.filter(child => child.type === 'toggle');
              const otherContent = children.filter(child => child.type !== 'toggle');
              
              console.log(`    🔽 Nested toggles: ${nestedToggles.length}`);
              console.log(`    📄 Other content blocks: ${otherContent.length}`);
              
              if (nestedToggles.length > 0) {
                // This is a category toggle with video toggles inside
                console.log(`    📁 CATEGORY TOGGLE: "${toggleTitle}" with ${nestedToggles.length} video toggles`);
                
                // Extract each nested toggle as a separate item
                for (const nestedToggle of nestedToggles) {
                  const videoToggleItem = await this.extractVideoToggle(
                    nestedToggle, 
                    accessToken, 
                    pageTitle, 
                    toggleTitle
                  );
                  
                  if (videoToggleItem) {
                    toggleItems.push(videoToggleItem);
                  }
                }
                
                // Also create a summary item for the category if it has other content
                if (otherContent.length > 0) {
                  const categoryContent = await this.extractContentRecursively(otherContent, accessToken, 0);
                  if (categoryContent.trim()) {
                    const categoryItem = {
                      id: `${block.id}_category`,
                      title: `${pageTitle} → ${toggleTitle} (Category Overview)`,
                      content: categoryContent,
                      type: 'toggle',
                      toggleTitle: toggleTitle,
                      parentPage: pageTitle,
                      lastEdited: new Date().toISOString(),
                      url: `notion://www.notion.so/${block.id}`,
                      contentType: 'toggle',
                      toggleLevel: 'category',
                      wordCount: categoryContent.split(/\s+/).length,
                      isClosedToggle: false,
                      extractionMethod: 'category_overview',
                    };
                    
                    toggleItems.push(categoryItem);
                    console.log(`    ✅ Added category overview: "${toggleTitle}"`);
                  }
                }
                
              } else {
                // No nested toggles, but has content - treat as direct content toggle
                console.log(`    📄 DIRECT CONTENT TOGGLE: "${toggleTitle}" with ${otherContent.length} content blocks`);
                
                const directContent = await this.extractContentRecursively(children, accessToken, 0);
                
                const finalContent = directContent.trim() || this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
                const directItem = {
                  id: `${block.id}_direct`,
                  title: `${pageTitle} → ${toggleTitle}`,
                  content: finalContent || 'No content available', // Ensure content is never undefined
                  type: 'toggle',
                  toggleTitle: toggleTitle,
                  parentPage: pageTitle,
                  lastEdited: new Date().toISOString(),
                  url: `notion://www.notion.so/${block.id}`,
                  contentType: 'toggle',
                  toggleLevel: 'direct',
                  wordCount: Math.max(1, (finalContent || '').split(/\s+/).length),
                  isClosedToggle: !directContent.trim(),
                  extractionMethod: directContent.trim() ? 'direct_content' : 'placeholder',
                };
                
                toggleItems.push(directItem);
                console.log(`    ✅ Added direct toggle: "${toggleTitle}" (${directItem.extractionMethod})`);
              }
              
            } else {
              // No children returned - likely a closed toggle
              console.log(`    🔒 CLOSED TOGGLE: "${toggleTitle}" - no children returned, creating placeholder`);
              
              const placeholderContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
              const placeholderItem = {
                id: `${block.id}_closed`,
                title: `${pageTitle} → ${toggleTitle}`,
                content: placeholderContent || 'No content available', // Ensure content is never undefined
                type: 'toggle',
                toggleTitle: toggleTitle,
                parentPage: pageTitle,
                lastEdited: new Date().toISOString(),
                url: `notion://www.notion.so/${block.id}`,
                contentType: 'toggle',
                toggleLevel: 'closed',
                wordCount: 50,
                isClosedToggle: true,
                extractionMethod: 'closed_placeholder',
              };
              
              toggleItems.push(placeholderItem);
              console.log(`    ✅ Added closed toggle placeholder: "${toggleTitle}"`);
            }
            
          } else {
            // API error - still create placeholder
            console.log(`    ❌ API error for "${toggleTitle}": ${childrenResponse.status}`);
            
            const errorPlaceholderItem = {
              id: `${block.id}_error`,
              title: `${pageTitle} → ${toggleTitle}`,
              content: this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle),
              type: 'toggle',
              toggleTitle: toggleTitle,
              parentPage: pageTitle,
              lastEdited: new Date().toISOString(),
              url: `notion://www.notion.so/${block.id}`,
              contentType: 'toggle',
              toggleLevel: 'error',
              wordCount: 50,
              isClosedToggle: true,
              extractionMethod: 'api_error_placeholder',
            };
            
            toggleItems.push(errorPlaceholderItem);
            console.log(`    ⚠️  Added error placeholder: "${toggleTitle}"`);
          }
          
        } catch (error) {
          console.warn(`  ❌ Exception processing toggle "${toggleTitle}":`, error);
          
          // Emergency fallback
          const emergencyItem = {
            id: `${block.id}_emergency`,
            title: `${pageTitle} → ${toggleTitle}`,
            content: this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle),
            type: 'toggle',
            toggleTitle: toggleTitle,
            parentPage: pageTitle,
            lastEdited: new Date().toISOString(),
            url: `notion://www.notion.so/${block.id}`,
            contentType: 'toggle',
            toggleLevel: 'emergency',
            wordCount: 50,
            isClosedToggle: true,
            extractionMethod: 'emergency_fallback',
          };
          
          toggleItems.push(emergencyItem);
          console.log(`    🚨 Added emergency fallback: "${toggleTitle}"`);
        }
      }
    }
    
    console.log(`🔍 HIERARCHICAL EXTRACTION COMPLETE: ${toggleItems.length} items found`);
    if (toggleItems.length > 0) {
      console.log(`📊 Toggle levels: ${toggleItems.map(t => t.toggleLevel).join(', ')}`);
      console.log(`📊 Extraction methods: ${toggleItems.map(t => t.extractionMethod).join(', ')}`);
      console.log(`📊 Closed toggles: ${toggleItems.filter(t => t.isClosedToggle).length}/${toggleItems.length}`);
      
      // Debug each toggle
      toggleItems.forEach((toggle, index) => {
        console.log(`📋 Toggle ${index + 1}: "${toggle.toggleTitle}" (${toggle.extractionMethod}, ${toggle.wordCount} words)`);
      });
    } else {
      console.log(`⚠️  No hierarchical toggles extracted - this might indicate detection issues`);
    }
    
    return toggleItems;
  }

  // Extract individual video toggle with its content
  private async extractVideoToggle(nestedToggle: any, accessToken: string, pageTitle: string, categoryTitle: string): Promise<any | null> {
    const videoTitle = this.extractRichText(nestedToggle.toggle?.rich_text || []);
    
    if (!videoTitle.trim()) {
      console.log(`    ❌ Skipping nested toggle with empty title`);
      return null;
    }
    
    console.log(`      📹 Processing video toggle: "${videoTitle}"`);
    
    try {
      const videoResponse = await fetch('/api/notion-block-children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, blockId: nestedToggle.id }),
      });
      
      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        const videoChildren = videoData.results || [];
        
        console.log(`        📊 Video toggle has ${videoChildren.length} content blocks`);
        
        if (videoChildren.length > 0) {
          const videoContent = await this.extractContentRecursively(videoChildren, accessToken, 0);
          
          if (videoContent.trim()) {
            const videoItem = {
              id: `${nestedToggle.id}_video`,
              title: `${pageTitle} → ${categoryTitle} → ${videoTitle}`,
              content: videoContent,
              type: 'toggle',
              toggleTitle: videoTitle,
              categoryTitle: categoryTitle,
              parentPage: pageTitle,
              lastEdited: new Date().toISOString(),
              url: `notion://www.notion.so/${nestedToggle.id}`,
              contentType: 'toggle',
              toggleLevel: 'video',
              wordCount: videoContent.split(/\s+/).length,
              isClosedToggle: false,
              extractionMethod: 'video_content',
            };
            
            console.log(`        ✅ Extracted video content: ${videoContent.length} chars`);
            return videoItem;
          }
        }
        
        // No content found - create placeholder for closed video toggle
        const placeholderContent = this.createVideoTogglePlaceholder(videoTitle, categoryTitle, pageTitle);
        const placeholderItem = {
          id: `${nestedToggle.id}_video_placeholder`,
          title: `${pageTitle} → ${categoryTitle} → ${videoTitle}`,
          content: placeholderContent,
          type: 'toggle',
          toggleTitle: videoTitle,
          categoryTitle: categoryTitle,
          parentPage: pageTitle,
          lastEdited: new Date().toISOString(),
          url: `notion://www.notion.so/${nestedToggle.id}`,
          contentType: 'toggle',
          toggleLevel: 'video',
          wordCount: placeholderContent.split(/\s+/).length,
          isClosedToggle: true,
          extractionMethod: 'video_placeholder',
        };
        
        console.log(`        🔒 Created placeholder for closed video toggle`);
        return placeholderItem;
        
      } else {
        console.log(`        ❌ API error for video toggle: ${videoResponse.status}`);
        return null;
      }
      
    } catch (error) {
      console.warn(`      ❌ Failed to extract video toggle "${videoTitle}":`, error);
      return null;
    }
  }

  // Create placeholder content specifically for video toggles
  private createVideoTogglePlaceholder(videoTitle: string, categoryTitle: string, pageTitle: string): string {
    return `# 📹 ${videoTitle}

This video toggle contains detailed notes and insights from a specific video or learning source.

**📁 Category**: ${categoryTitle}
**📄 Source Page**: ${pageTitle}

**⚠️ Closed Video Toggle**: This toggle is currently closed/collapsed in Notion. To access the actual notes:

1. Open your Notion page: "${pageTitle}"
2. Expand the "${categoryTitle}" category toggle
3. Find and expand the "${videoTitle}" video toggle
4. The detailed notes (bullet points, insights, action items) will then be accessible

**Expected Content Structure**:
This video toggle likely contains:
- 📝 Key takeaways and insights from the video
- 🎯 Action items and implementation steps  
- 💡 Important quotes and timestamps
- 📋 Structured notes in bullet points or numbered lists
- 🔗 Related resources and references

**Recommendation**: Expand this video toggle in Notion to access the detailed learning notes and maximize the AI summary value.`;
  }

  // Enhanced placeholder for your specific case
  private createPlaceholderContentForClosedToggle(toggleTitle: string, pageTitle: string): string {
    // Analyze the toggle title to create more specific placeholder content
    const titleLower = toggleTitle.toLowerCase();
    
    // Special handling for your specific toggles
    if (titleLower.includes('career') && titleLower.includes('important')) {
      return `# 🎯 ${toggleTitle}

This is your main career development toggle containing curated insights from YouTube videos and learning content.

**⚠️ Closed Toggle Detected**: This toggle appears to be closed/collapsed in Notion. Based on the title "${toggleTitle}", this likely contains your most valuable career-related notes and insights.

**Expected Content Structure**:
This toggle likely contains nested video toggles with content such as:
- 📹 Individual YouTube video notes with specific takeaways
- 💼 Career development strategies and frameworks
- 🎯 Professional growth action items
- 📚 Learning insights from productivity and business content
- 🚀 Implementation steps for career advancement

**To Access Full Content**:
1. Open your Notion page: "${pageTitle}"
2. Click the ▶️ arrow next to "${toggleTitle}" to expand it
3. You should see individual video toggles inside
4. Expand specific video toggles to access detailed notes
5. Return to Nemory and generate a new summary

**High-Value Content Expected**: This toggle likely contains your most actionable career development insights. Expanding it will unlock focused, video-specific summaries instead of this placeholder.

**Current Status**: Placeholder content - expand toggle for actual insights
**Recommendation**: This is a high-priority toggle to expand for maximum AI summary value.`;
    }
    
    if (titleLower.includes('general') && titleLower.includes('topic')) {
      return `# 📝 ${toggleTitle}

This toggle contains general notes and insights organized under a broad topic category.

**⚠️ Closed Toggle Detected**: This toggle is currently closed/collapsed in Notion.

**Expected Content Structure**:
This toggle likely contains:
- 📋 General notes and observations
- 💡 Miscellaneous insights and ideas
- 📚 Learning content that doesn't fit specific categories
- 🔗 Resources and references
- 📝 Quick notes and thoughts

**To Access Full Content**:
1. Open your Notion page: "${pageTitle}"
2. Click the ▶️ arrow next to "${toggleTitle}" to expand it
3. Review the content inside
4. Return to Nemory for an updated summary

**Current Status**: Placeholder content - expand toggle for actual content
**Recommendation**: Expand this toggle to access the general notes and insights.`;
    }
    
    // Default enhanced placeholder
    let contentType = 'general';
    let specificContent = '';
    
    if (titleLower.includes('youtube') || titleLower.includes('video')) {
      contentType = 'video_notes';
      specificContent = `
**Video Learning Content**:
This toggle likely contains:
- Key takeaways and insights from videos
- Important timestamps and quotes
- Action items and implementation steps
- Personal reflections and notes
- Links and references mentioned`;
    } else if (titleLower.includes('career') || titleLower.includes('job') || titleLower.includes('work')) {
      contentType = 'career';
      specificContent = `
**Career Development Content**:
This toggle likely contains:
- Professional development insights
- Career strategy and planning notes
- Skills and competencies to develop
- Networking and opportunity information
- Goal setting and progress tracking`;
    } else {
      specificContent = `
**Structured Content**:
This toggle likely contains:
- Key insights and takeaways related to ${toggleTitle.toLowerCase()}
- Important notes and observations
- Action items and next steps
- Detailed information and analysis
- Supporting resources and references`;
    }
    
    return `# ${toggleTitle}

This toggle contains structured notes and insights related to "${toggleTitle}".

**⚠️ Closed Toggle Detected**: This toggle appears to be closed/collapsed in Notion, which means its content is not accessible through the API until it's manually expanded.

**To Access Full Content**:
1. Open your Notion page: "${pageTitle}"
2. Click the ▶️ arrow next to "${toggleTitle}" to expand it
3. Wait a moment for Notion to register the change
4. Return to Nemory and generate a new summary
5. The system will then extract the actual content from inside the toggle

${specificContent}

**Current Status**: Placeholder content generated from toggle title
**Content Type**: ${contentType}
**Recommendation**: Expand this toggle in Notion to unlock its full content for comprehensive AI analysis.

---

*This is placeholder content created because the toggle is currently closed. The actual content may be significantly different and more detailed than this prediction.*`;
  }

  // Extract toggle content with deep nested extraction - handles both open and closed toggles (LEGACY METHOD)
  private async extractToggleContent(blocks: any[], accessToken: string, pageTitle: string): Promise<any[]> {
    const toggleItems = [];
    
    console.log(`🔍 Extracting toggle content from ${blocks.length} blocks...`);
    
    for (const block of blocks) {
      if (block.type === 'toggle') {
        try {
          const toggleTitle = this.extractRichText(block.toggle?.rich_text || []);
          
          if (!toggleTitle.trim() || toggleTitle.trim().length < 2) {
            console.log(`  ❌ Skipping toggle with empty/short title: "${toggleTitle}"`);
            continue;
          }
          
          console.log(`  🔽 Processing toggle: "${toggleTitle}"`);
          console.log(`    📊 Block info: has_children=${block.has_children}, block_id=${block.id}`);
          
          let toggleContent = '';
          let extractionMethod = 'none';
          
          // ENHANCED: Always try to fetch children regardless of has_children flag
          // This is critical for closed toggles which show has_children=false
          try {
            console.log(`    📡 Attempting to fetch children (ignoring has_children=${block.has_children} flag)`);
            
            const childrenResponse = await fetch('/api/notion-block-children', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken, blockId: block.id }),
            });
            
            console.log(`    📡 Response status: ${childrenResponse.status}`);
            
            if (childrenResponse.ok) {
              const childrenData = await childrenResponse.json();
              const children = childrenData.results || [];
              
              console.log(`    📊 API returned ${children.length} children for toggle "${toggleTitle}"`);
              
              if (children.length > 0) {
                console.log(`    📋 Children types:`, children.map(c => c.type));
                
                // Method 1: Extract actual content from children (OPEN TOGGLE)
                toggleContent = await this.extractContentRecursively(children, accessToken, 0);
                
                if (this.hasSignificantContent(toggleContent)) {
                  extractionMethod = 'api_children';
                  console.log(`    ✅ Method 1: Extracted real content (${toggleContent.length} chars)`);
                  console.log(`    📄 Content preview: "${toggleContent.substring(0, 100)}..."`);
                } else {
                  // Even if we got children, the content might be empty
                  console.log(`    ⚠️  Children returned but content not significant, treating as closed toggle`);
                  toggleContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
                  extractionMethod = 'placeholder_empty_children';
                }
              } else {
                console.log(`    ⚠️  No children returned by API - this might be a closed toggle`);
                console.log(`    💡 Trying alternative extraction...`);
                
                // Method 2: Create placeholder content for closed toggles
                toggleContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
                extractionMethod = 'placeholder';
                
                console.log(`    📝 Method 2: Creating content from toggle title for closed toggle`);
                console.log(`    📝 Method 2 result: ${toggleContent.length} chars of placeholder content`);
              }
            } else {
              const errorText = await childrenResponse.text();
              console.log(`    ❌ API error: ${childrenResponse.status} - ${errorText}`);
              
              // Method 3: Fallback to placeholder on API error
              toggleContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
              extractionMethod = 'placeholder_api_error';
              
              console.log(`    📝 Method 3: Using placeholder due to API error`);
            }
          } catch (error) {
            console.warn(`    ❌ Exception fetching children for "${toggleTitle}":`, error);
            
            // Method 4: Final fallback to placeholder
            toggleContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
            extractionMethod = 'placeholder_exception';
            
            console.log(`    📝 Method 4: Exception fallback to placeholder`);
          }
          
          // ENHANCED: Very lenient inclusion criteria for closed toggles
          const hasTitle = toggleTitle.trim().length > 2;
          const hasContent = toggleContent.trim().length > 20;
          const isPlaceholder = extractionMethod.includes('placeholder');
          const isRealContent = extractionMethod === 'api_children';
          
          // Include if:
          // 1. Has real content from API, OR
          // 2. Has placeholder content with a meaningful title, OR  
          // 3. Has any content and a title (very lenient)
          const shouldInclude = isRealContent || 
                               (isPlaceholder && hasTitle) || 
                               (hasTitle && hasContent);
          
          if (shouldInclude) {
            const isClosedToggle = extractionMethod.includes('placeholder');
            
            const item = {
              id: `${block.id}_toggle`,
              title: `${pageTitle} → ${toggleTitle}`,
              content: toggleContent,
              type: 'toggle',
              toggleTitle: toggleTitle,
              parentPage: pageTitle,
              lastEdited: new Date().toISOString(),
              url: `notion://www.notion.so/${block.id}`,
              contentType: 'toggle',
              wordCount: Math.max(1, toggleContent.split(/\s+/).length),
              isClosedToggle: isClosedToggle,
              extractionMethod: extractionMethod,
              // Additional metadata for debugging
              originalHasChildren: block.has_children,
              blockId: block.id,
            };
            
            toggleItems.push(item);
            console.log(`    ✅ Added toggle "${toggleTitle}" (method: ${extractionMethod}, closed: ${isClosedToggle})`);
            console.log(`    📊 Toggle stats: ${item.wordCount} words, has_children=${block.has_children}`);
          } else {
            console.log(`    ❌ Skipped toggle "${toggleTitle}" - insufficient content`);
            console.log(`    📊 Skip reasons: hasTitle=${hasTitle}, hasContent=${hasContent}, method=${extractionMethod}`);
          }
        } catch (error) {
          console.warn(`  ❌ Failed to process toggle ${block.id}:`, error);
          
          // Emergency fallback: try to create a minimal toggle item
          try {
            const emergencyTitle = this.extractRichText(block.toggle?.rich_text || []);
            if (emergencyTitle && emergencyTitle.trim().length > 2) {
              const emergencyItem = {
                id: `${block.id}_toggle_emergency`,
                title: `${pageTitle} → ${emergencyTitle}`,
                content: this.createPlaceholderContentForClosedToggle(emergencyTitle, pageTitle),
                type: 'toggle',
                toggleTitle: emergencyTitle,
                parentPage: pageTitle,
                lastEdited: new Date().toISOString(),
                url: `notion://www.notion.so/${block.id}`,
                contentType: 'toggle',
                wordCount: 50, // Estimated for placeholder
                isClosedToggle: true,
                extractionMethod: 'emergency_fallback',
                originalHasChildren: block.has_children,
                blockId: block.id,
              };
              
              toggleItems.push(emergencyItem);
              console.log(`    🚨 Emergency fallback: Added toggle "${emergencyTitle}"`);
            }
          } catch (emergencyError) {
            console.warn(`  🚨 Emergency fallback also failed:`, emergencyError);
          }
        }
      }
    }
    
    console.log(`🔍 Toggle extraction complete: ${toggleItems.length} toggles found`);
    if (toggleItems.length > 0) {
      console.log(`📊 Extraction methods used: ${toggleItems.map(t => t.extractionMethod).join(', ')}`);
      console.log(`📊 Closed toggles: ${toggleItems.filter(t => t.isClosedToggle).length}`);
      console.log(`📊 Open toggles: ${toggleItems.filter(t => !t.isClosedToggle).length}`);
      
      // Debug: Show details of each toggle
      toggleItems.forEach((toggle, index) => {
        console.log(`📋 Toggle ${index + 1}: "${toggle.toggleTitle}" - ${toggle.extractionMethod} (${toggle.wordCount} words)`);
      });
    } else {
      console.log(`⚠️  No toggles extracted - this might indicate an issue with toggle detection`);
    }
    
    return toggleItems;
  }

  // Extract flat toggles (non-hierarchical toggle collections)
  private async extractFlatToggles(blocks: any[], accessToken: string, pageTitle: string): Promise<any[]> {
    const toggleItems = [];
    
    console.log(`🔍 Extracting flat toggles from ${blocks.length} blocks...`);
    
    for (const block of blocks) {
      if (block.type === 'toggle') {
        const toggleTitle = this.extractRichText(block.toggle?.rich_text || []);
        
        if (!toggleTitle.trim() || toggleTitle.trim().length < 2) {
          continue;
        }
        
        console.log(`  🔽 Processing flat toggle: "${toggleTitle}"`);
        
        try {
          const childrenResponse = await fetch('/api/notion-block-children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, blockId: block.id }),
          });
          
          if (childrenResponse.ok) {
            const childrenData = await childrenResponse.json();
            const children = childrenData.results || [];
            
            let toggleContent = '';
            let extractionMethod = 'none';
            
            if (children.length > 0) {
              toggleContent = await this.extractContentRecursively(children, accessToken, 0);
              extractionMethod = 'flat_content';
            } else {
              toggleContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
              extractionMethod = 'flat_placeholder';
            }
            
            if (toggleContent.trim()) {
              const item = {
                id: `${block.id}_flat`,
                title: `${pageTitle} → ${toggleTitle}`,
                content: toggleContent,
                type: 'toggle',
                toggleTitle: toggleTitle,
                parentPage: pageTitle,
                lastEdited: new Date().toISOString(),
                url: `notion://www.notion.so/${block.id}`,
                contentType: 'toggle',
                toggleLevel: 'flat',
                wordCount: toggleContent.split(/\s+/).length,
                isClosedToggle: extractionMethod.includes('placeholder'),
                extractionMethod: extractionMethod,
              };
              
              toggleItems.push(item);
              console.log(`    ✅ Added flat toggle: "${toggleTitle}"`);
            }
          }
        } catch (error) {
          console.warn(`  ❌ Failed to process flat toggle ${block.id}:`, error);
        }
      }
    }
    
    console.log(`🔍 Flat toggle extraction complete: ${toggleItems.length} items found`);
    return toggleItems;
  }

  // Extract structured sections based on headings
  private extractStructuredSections(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const sectionItems = [];
    let currentSection: any = null;
    let sectionContent: any[] = [];
    
    console.log(`📋 Extracting structured sections from ${blocks.length} blocks...`);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Check if this is a heading that starts a new section
      if (['heading_1', 'heading_2', 'heading_3'].includes(block.type)) {
        // Save previous section if it exists
        if (currentSection && sectionContent.length > 0) {
          const content = this.extractTextFromBlocks(sectionContent);
          if (content.trim().length > 20) {
            const item = {
              id: `${pageId}_section_${sectionItems.length}`,
              title: `${pageTitle} → ${currentSection.title}`,
              content: content,
              type: 'section',
              sectionTitle: currentSection.title,
              sectionLevel: currentSection.level,
              parentPage: pageTitle,
              lastEdited: lastEdited,
              url: url,
              contentType: 'section',
              wordCount: content.split(/\s+/).length,
            };
            
            sectionItems.push(item);
            console.log(`  ✅ Added section: "${currentSection.title}"`);
          }
        }
        
        // Start new section
        const headingText = this.extractRichText(block[block.type]?.rich_text || []);
        currentSection = {
          title: headingText,
          level: block.type,
          blockId: block.id
        };
        sectionContent = [];
        
      } else {
        // Add block to current section
        if (currentSection) {
          sectionContent.push(block);
        }
      }
    }
    
    // Don't forget the last section
    if (currentSection && sectionContent.length > 0) {
      const content = this.extractTextFromBlocks(sectionContent);
      if (content.trim().length > 20) {
        const item = {
          id: `${pageId}_section_${sectionItems.length}`,
          title: `${pageTitle} → ${currentSection.title}`,
          content: content,
          type: 'section',
          sectionTitle: currentSection.title,
          sectionLevel: currentSection.level,
          parentPage: pageTitle,
          lastEdited: lastEdited,
          url: url,
          contentType: 'section',
          wordCount: content.split(/\s+/).length,
        };
        
        sectionItems.push(item);
        console.log(`  ✅ Added final section: "${currentSection.title}"`);
      }
    }
    
    console.log(`📋 Structured section extraction complete: ${sectionItems.length} sections found`);
    return sectionItems;
  }

  // Extract list collections (grouped lists)
  private extractListCollections(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const collections = [];
    let currentCollection: any[] = [];
    let collectionType = '';
    
    console.log(`📝 Extracting list collections from ${blocks.length} blocks...`);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type)) {
        if (currentCollection.length === 0) {
          collectionType = block.type;
        }
        
        if (block.type === collectionType) {
          currentCollection.push(block);
        } else {
          // Different list type, save current collection and start new one
          if (currentCollection.length >= 3) { // Minimum 3 items for a collection
            const content = this.extractTextFromBlocks(currentCollection);
            const item = {
              id: `${pageId}_list_collection_${collections.length}`,
              title: `${pageTitle} → ${this.getListCollectionTitle(collectionType, currentCollection.length)}`,
              content: content,
              type: 'list_collection',
              listType: collectionType,
              itemCount: currentCollection.length,
              parentPage: pageTitle,
              lastEdited: lastEdited,
              url: url,
              contentType: 'list_collection',
              wordCount: content.split(/\s+/).length,
            };
            
            collections.push(item);
            console.log(`  ✅ Added ${collectionType} collection with ${currentCollection.length} items`);
          }
          
          currentCollection = [block];
          collectionType = block.type;
        }
      } else {
        // Non-list block, save current collection if it's substantial
        if (currentCollection.length >= 3) {
          const content = this.extractTextFromBlocks(currentCollection);
          const item = {
            id: `${pageId}_list_collection_${collections.length}`,
            title: `${pageTitle} → ${this.getListCollectionTitle(collectionType, currentCollection.length)}`,
            content: content,
            type: 'list_collection',
            listType: collectionType,
            itemCount: currentCollection.length,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'list_collection',
            wordCount: content.split(/\s+/).length,
          };
          
          collections.push(item);
          console.log(`  ✅ Added ${collectionType} collection with ${currentCollection.length} items`);
        }
        
        currentCollection = [];
        collectionType = '';
      }
    }
    
    // Don't forget the last collection
    if (currentCollection.length >= 3) {
      const content = this.extractTextFromBlocks(currentCollection);
      const item = {
        id: `${pageId}_list_collection_${collections.length}`,
        title: `${pageTitle} → ${this.getListCollectionTitle(collectionType, currentCollection.length)}`,
        content: content,
        type: 'list_collection',
        listType: collectionType,
        itemCount: currentCollection.length,
        parentPage: pageTitle,
        lastEdited: lastEdited,
        url: url,
        contentType: 'list_collection',
        wordCount: content.split(/\s+/).length,
      };
      
      collections.push(item);
      console.log(`  ✅ Added final ${collectionType} collection with ${currentCollection.length} items`);
    }
    
    console.log(`📝 List collection extraction complete: ${collections.length} collections found`);
    return collections;
  }

  // Extract individual list items
  private extractIndividualListItems(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const items = [];
    
    console.log(`📋 Extracting individual list items from ${blocks.length} blocks...`);
    
    blocks.forEach((block, index) => {
      if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type)) {
        const content = this.extractTextFromBlocks([block]);
        
        if (content.trim().length > 10) { // Minimum content threshold
          const item = {
            id: `${pageId}_list_item_${index}`,
            title: `${pageTitle} → ${content.substring(0, 50)}...`,
            content: content,
            type: 'list_item',
            listType: block.type,
            isCompleted: block.type === 'to_do' ? block.to_do?.checked : undefined,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'list_item',
            wordCount: content.split(/\s+/).length,
          };
          
          items.push(item);
        }
      }
    });
    
    console.log(`📋 Individual list extraction complete: ${items.length} items found`);
    return items;
  }

  // Extract highlight blocks (callouts and quotes)
  private extractHighlightBlocks(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const highlights = [];
    
    console.log(`💡 Extracting highlight blocks from ${blocks.length} blocks...`);
    
    blocks.forEach((block, index) => {
      if (['callout', 'quote'].includes(block.type)) {
        const content = this.extractTextFromBlocks([block]);
        
        if (content.trim().length > 15) {
          const item = {
            id: `${pageId}_highlight_${index}`,
            title: `${pageTitle} → ${block.type === 'callout' ? 'Callout' : 'Quote'}`,
            content: content,
            type: 'highlight',
            highlightType: block.type,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'highlight',
            wordCount: content.split(/\s+/).length,
          };
          
          highlights.push(item);
          console.log(`  ✅ Added ${block.type}: "${content.substring(0, 50)}..."`);
        }
      }
    });
    
    console.log(`💡 Highlight extraction complete: ${highlights.length} highlights found`);
    return highlights;
  }

  // Extract mixed content (adaptive approach for complex pages)
  private async extractMixedContent(blocks: any[], accessToken: string, pageTitle: string, pageId: string, lastEdited: string, url: string): Promise<any[]> {
    const items = [];
    
    console.log(`🔀 Extracting mixed content from ${blocks.length} blocks...`);
    
    // Try multiple extraction approaches and combine results
    const toggleItems = await this.extractFlatToggles(blocks, accessToken, pageTitle);
    const sectionItems = this.extractStructuredSections(blocks, pageTitle, pageId, lastEdited, url);
    const highlightItems = this.extractHighlightBlocks(blocks, pageTitle, pageId, lastEdited, url);
    
    // Add all items but limit each type
    items.push(...toggleItems.slice(0, 3)); // Max 3 toggles
    items.push(...sectionItems.slice(0, 2)); // Max 2 sections
    items.push(...highlightItems.slice(0, 2)); // Max 2 highlights
    
    console.log(`🔀 Mixed content extraction complete: ${items.length} items found`);
    return items;
  }

  // Extract full page content as single item
  private extractFullPageContent(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string, properties: any, analysis: any): any | null {
    console.log(`📄 Extracting full page content for "${pageTitle}"`);
    
    const fullContent = this.extractTextFromBlocks(blocks);
    
    if (fullContent.trim().length > 20) {
      const item = {
        id: pageId,
        title: pageTitle || 'Untitled',
        content: fullContent,
        type: 'page',
        parentPage: pageTitle,
        lastEdited: lastEdited,
        url: url,
        properties: properties,
        contentType: 'page',
        contentStructure: analysis,
        wordCount: fullContent.split(/\s+/).length,
        organizationStyle: analysis.organizationStyle,
        noteStyle: analysis.noteStyle,
      };
      
      console.log(`📄 Full page extraction complete: ${item.wordCount} words`);
      return item;
    }
    
    return null;
  }

  // Simple extraction method as fallback when complex extraction fails
  private extractSimplePageContent(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string, properties: any): any | null {
    console.log(`📄 SIMPLE EXTRACTION for "${pageTitle}"`);
    
    let pageContent = '';
    
    blocks.forEach(block => {
      let blockText = '';
      
      switch (block.type) {
        case 'paragraph':
          blockText = block.paragraph?.rich_text?.map((t: any) => t.plain_text).join('') || '';
          break;
        case 'heading_1':
          blockText = '# ' + (block.heading_1?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'heading_2':
          blockText = '## ' + (block.heading_2?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'heading_3':
          blockText = '### ' + (block.heading_3?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'bulleted_list_item':
          blockText = '• ' + (block.bulleted_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'numbered_list_item':
          blockText = '1. ' + (block.numbered_list_item?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'to_do':
          const checked = block.to_do?.checked ? '[x]' : '[ ]';
          blockText = `${checked} ${block.to_do?.rich_text?.map((t: any) => t.plain_text).join('') || ''}`;
          break;
        case 'toggle':
          blockText = '🔽 ' + (block.toggle?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'quote':
          blockText = '> ' + (block.quote?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'callout':
          blockText = '📝 ' + (block.callout?.rich_text?.map((t: any) => t.plain_text).join('') || '');
          break;
        case 'code':
          blockText = '```\n' + (block.code?.rich_text?.map((t: any) => t.plain_text).join('') || '') + '\n```';
          break;
      }
      
      if (blockText.trim()) {
        pageContent += blockText + '\n\n';
      }
    });
    
    // More lenient content check - only need 20 characters
    if (pageContent.trim().length > 20) {
      const item = {
        id: pageId,
        title: pageTitle || 'Untitled',
        content: pageContent.trim(),
        type: 'page',
        parentPage: pageTitle,
        lastEdited: lastEdited,
        url: url,
        properties: properties,
        contentType: 'page',
        wordCount: pageContent.split(/\s+/).length,
        extractionMethod: 'simple_fallback'
      };
      
      console.log(`📄 Simple extraction complete: ${item.wordCount} words`);
      return item;
    }
    
    console.log(`📄 Simple extraction failed: insufficient content (${pageContent.length} chars)`);
    return null;
  }

  // Helper method to generate list collection titles
  private getListCollectionTitle(listType: string, itemCount: number): string {
    const typeNames = {
      'bulleted_list_item': 'Bullet Points',
      'numbered_list_item': 'Numbered List',
      'to_do': 'Task List'
    };
    
    return `${typeNames[listType as keyof typeof typeNames] || 'List'} (${itemCount} items)`;
  }



  // Check if content has significant meaningful text
  private hasSignificantContent(content: string): boolean {
    if (!content || content.trim().length < 10) return false;
    
    // More lenient check for meaningful content
    const trimmed = content.trim();
    
    // Check for meaningful words (not just whitespace, punctuation, or very short words)
    const words = trimmed.split(/\s+/).filter(word => 
      word.length > 1 && 
      !/^[^\w]*$/.test(word) // Not just punctuation
    );
    
    // Very lenient criteria:
    // - At least 3 meaningful words, OR
    // - At least 15 characters of content, OR
    // - Contains common content indicators
    const hasWords = words.length >= 3;
    const hasLength = trimmed.length >= 15;
    const hasContentIndicators = /\b(note|idea|task|action|important|key|insight|takeaway)\b/i.test(trimmed);
    
    return hasWords || hasLength || hasContentIndicators;
  }

  // Enhanced recursive extraction with hierarchical toggle detection
  private async extractContentRecursively(blocks: any[], accessToken: string, depth: number = 0, parentToggleTitle?: string): Promise<string> {
    if (depth > 4) { // Increased depth for nested toggles
      console.warn('Maximum recursion depth reached');
      return '';
    }
    
    let content = '';
    
    for (const block of blocks) {
      // Handle different block types
      switch (block.type) {
        case 'paragraph':
          const paragraphText = this.extractRichText(block.paragraph?.rich_text || []);
          if (paragraphText.trim()) {
            content += paragraphText + '\n\n';
          }
          break;
          
        case 'heading_1':
          const h1Text = this.extractRichText(block.heading_1?.rich_text || []);
          if (h1Text.trim()) {
            content += '# ' + h1Text + '\n\n';
          }
          break;
          
        case 'heading_2':
          const h2Text = this.extractRichText(block.heading_2?.rich_text || []);
          if (h2Text.trim()) {
            content += '## ' + h2Text + '\n\n';
          }
          break;
          
        case 'heading_3':
          const h3Text = this.extractRichText(block.heading_3?.rich_text || []);
          if (h3Text.trim()) {
            content += '### ' + h3Text + '\n\n';
          }
          break;
          
        case 'bulleted_list_item':
          const bulletText = this.extractRichText(block.bulleted_list_item?.rich_text || []);
          if (bulletText.trim()) {
            content += '• ' + bulletText + '\n';
          }
          break;
          
        case 'numbered_list_item':
          const numberedText = this.extractRichText(block.numbered_list_item?.rich_text || []);
          if (numberedText.trim()) {
            content += '1. ' + numberedText + '\n';
          }
          break;
          
        case 'to_do':
          const todoText = this.extractRichText(block.to_do?.rich_text || []);
          if (todoText.trim()) {
            const checked = block.to_do?.checked ? '[x]' : '[ ]';
            content += `${checked} ${todoText}\n`;
          }
          break;
          
        case 'quote':
          const quoteText = this.extractRichText(block.quote?.rich_text || []);
          if (quoteText.trim()) {
            content += '> ' + quoteText + '\n\n';
          }
          break;
          
        case 'callout':
          const calloutText = this.extractRichText(block.callout?.rich_text || []);
          if (calloutText.trim()) {
            content += '📝 ' + calloutText + '\n\n';
          }
          break;
          
        case 'code':
          const codeText = this.extractRichText(block.code?.rich_text || []);
          if (codeText.trim()) {
            content += '```\n' + codeText + '\n```\n\n';
          }
          break;
          
        case 'toggle':
          // ENHANCED: Handle hierarchical nested toggles with proper depth tracking
          const nestedToggleTitle = this.extractRichText(block.toggle?.rich_text || []);
          if (nestedToggleTitle.trim()) {
            try {
              const indentation = '  '.repeat(depth);
              console.log(`${indentation}🔽 Processing nested toggle (depth ${depth}): "${nestedToggleTitle}"`);
              console.log(`${indentation}   Parent toggle: ${parentToggleTitle || 'None'}`);
              console.log(`${indentation}   has_children: ${block.has_children}`);
              
              const nestedResponse = await fetch('/api/notion-block-children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, blockId: block.id }),
              });
              
              if (nestedResponse.ok) {
                const nestedData = await nestedResponse.json();
                const nestedChildren = nestedData.results || [];
                
                console.log(`${indentation}   📊 Found ${nestedChildren.length} children`);
                
                if (nestedChildren.length > 0) {
                  // Recursively extract content from nested toggle
                  const nestedContent = await this.extractContentRecursively(
                    nestedChildren, 
                    accessToken, 
                    depth + 1, 
                    nestedToggleTitle
                  );
                  
                  if (nestedContent.trim()) {
                    // Format based on depth - deeper toggles are likely video-specific content
                    if (depth >= 1) {
                      // This is likely a video-specific toggle with actual content
                      content += `\n## 📹 ${nestedToggleTitle}\n${nestedContent}\n`;
                      console.log(`${indentation}   ✅ Extracted video content: ${nestedContent.length} chars`);
                    } else {
                      // This is a higher-level organizational toggle
                      content += `\n🔽 ${nestedToggleTitle}\n${nestedContent}\n`;
                      console.log(`${indentation}   ✅ Extracted category content: ${nestedContent.length} chars`);
                    }
                  } else {
                    // No content but include the structure
                    content += `\n🔽 ${nestedToggleTitle}\n[Toggle detected but no accessible content]\n`;
                    console.log(`${indentation}   ⚠️  Toggle detected but no content extracted`);
                  }
                } else {
                  // No children - might be closed or empty
                  if (depth >= 1) {
                    // Likely a closed video toggle - create placeholder
                    content += `\n## 📹 ${nestedToggleTitle}\n[Closed video toggle - expand in Notion to access notes]\n`;
                    console.log(`${indentation}   🔒 Closed video toggle detected`);
                  } else {
                    content += `\n🔽 ${nestedToggleTitle}\n[Closed category toggle - expand in Notion to access content]\n`;
                    console.log(`${indentation}   🔒 Closed category toggle detected`);
                  }
                }
              } else {
                // API error
                content += `\n🔽 ${nestedToggleTitle}\n[API error accessing toggle content]\n`;
                console.log(`${indentation}   ❌ API error for nested toggle`);
              }
            } catch (error) {
              const indentation = '  '.repeat(depth);
              console.warn(`${indentation}Failed to fetch nested toggle children for ${block.id}:`, error);
              content += `\n🔽 ${nestedToggleTitle}\n[Error accessing toggle content]\n`;
            }
          }
          break;
          
        case 'divider':
          content += '---\n\n';
          break;
          
        default:
          // Try to extract text from unknown block types
          const unknownText = this.extractTextFromBlocks([block]);
          if (unknownText.trim()) {
            content += unknownText + '\n';
          }
          break;
      }
      
      // If the block has children that we haven't processed yet, process them
      if (block.has_children && !['toggle'].includes(block.type)) {
        try {
          const childResponse = await fetch('/api/notion-block-children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, blockId: block.id }),
          });
          
          if (childResponse.ok) {
            const childData = await childResponse.json();
            const childContent = await this.extractContentRecursively(
              childData.results || [], 
              accessToken, 
              depth + 1, 
              parentToggleTitle
            );
            if (childContent.trim()) {
              content += childContent;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch children for block ${block.id}:`, error);
        }
      }
    }
    
    return content;
  }



  // Aggressive toggle extraction - specifically designed to handle closed/collapsed toggles
  private async extractToggleContentAggressive(blocks: any[], accessToken: string, pageTitle: string): Promise<any[]> {
    const toggleItems = [];
    
    console.log('🔍 Starting aggressive toggle extraction for closed toggles...');
    
    for (const block of blocks) {
      if (block.type === 'toggle') {
        try {
          const toggleTitle = this.extractRichText(block.toggle?.rich_text || []);
          
          if (!toggleTitle.trim()) {
            console.log('  ❌ Skipping toggle with empty title');
            continue;
          }
          
          console.log(`  🔍 Aggressively processing toggle: "${toggleTitle}"`);
          console.log(`    📊 Block state: has_children=${block.has_children}`);
          
          let toggleContent = '';
          let rawChildrenData = null;
          let extractionMethod = 'none';
          
          // Method 1: Try to fetch children regardless of has_children flag
          try {
            console.log(`    📡 Method 1: Force-fetching children for "${toggleTitle}" (ignoring has_children)`);
            const childrenResponse = await fetch('/api/notion-block-children', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken, blockId: block.id }),
            });
            
            if (childrenResponse.ok) {
              rawChildrenData = await childrenResponse.json();
              const children = rawChildrenData.results || [];
              
              console.log(`    📊 Method 1 result: ${children.length} children found`);
              
              if (children.length > 0) {
                toggleContent = await this.extractContentRecursively(children, accessToken, 0);
                extractionMethod = 'api_children';
                console.log(`    ✅ Method 1 success: ${toggleContent.length} chars extracted`);
              } else {
                console.log(`    ⚠️  Method 1: No children returned - toggle might be closed`);
              }
            } else {
              console.log(`    ❌ Method 1 failed: ${childrenResponse.status}`);
            }
          } catch (error) {
            console.warn(`    ❌ Method 1 exception:`, error);
          }
          
          // Method 2: If no content from children, use toggle title and create placeholder
          if (!toggleContent || toggleContent.trim().length < 10) {
            console.log(`    📝 Method 2: Creating content from toggle title for closed toggle`);
            
            const placeholderContent = this.createPlaceholderContentForClosedToggle(toggleTitle, pageTitle);
            toggleContent = placeholderContent;
            extractionMethod = 'placeholder';
            
            console.log(`    📝 Method 2 result: ${toggleContent.length} chars of placeholder content`);
          }
          
          // Method 3: Enhanced content analysis for closed toggles
          const contentAnalysis = this.analyzeToggleContent(toggleTitle, toggleContent, extractionMethod);
          
          console.log(`    📊 Content analysis for "${toggleTitle}":`, contentAnalysis);
          
          // Very lenient inclusion criteria for closed toggles
          const shouldInclude = contentAnalysis.shouldInclude;
          
          if (shouldInclude) {
            const item = {
              id: `${block.id}_toggle`,
              title: `${pageTitle} → ${toggleTitle}`,
              content: toggleContent,
              type: 'toggle',
              toggleTitle: toggleTitle,
              parentPage: pageTitle,
              lastEdited: new Date().toISOString(),
              url: `notion://www.notion.so/${block.id}`,
              contentType: 'toggle',
              wordCount: Math.max(1, toggleContent.split(/\s+/).length),
              extractionMethod: extractionMethod,
              isClosedToggle: extractionMethod === 'placeholder',
              contentAnalysis: contentAnalysis,
              rawChildrenData: rawChildrenData,
            };
            
            toggleItems.push(item);
            console.log(`    ✅ Added toggle "${toggleTitle}" (method: ${extractionMethod}, closed: ${item.isClosedToggle})`);
          } else {
            console.log(`    ❌ Skipped toggle "${toggleTitle}" - failed all extraction methods`);
          }
        } catch (error) {
          console.warn(`  ❌ Failed to process toggle ${block.id}:`, error);
        }
      }
    }
    
    console.log(`🔍 Aggressive extraction complete: ${toggleItems.length} toggles extracted`);
    console.log(`   📊 Extraction methods used:`, toggleItems.map(t => t.extractionMethod));
    console.log(`   📊 Closed toggles: ${toggleItems.filter(t => t.isClosedToggle).length}`);
    
    return toggleItems;
  }



  // Analyze toggle content to determine if it should be included
  private analyzeToggleContent(toggleTitle: string, content: string, extractionMethod: string) {
    const analysis = {
      contentLength: content.length,
      wordCount: content.split(/\s+/).length,
      extractionMethod: extractionMethod,
      hasTitle: toggleTitle.length > 0,
      hasContent: content.trim().length > 10,
      isPlaceholder: extractionMethod === 'placeholder',
      shouldInclude: false,
      reason: ''
    };

    // Always include if we have a meaningful title
    if (analysis.hasTitle && toggleTitle.length > 3) {
      analysis.shouldInclude = true;
      analysis.reason = 'Has meaningful toggle title';
    }

    // Include if we extracted actual content
    if (analysis.hasContent && extractionMethod === 'api_children') {
      analysis.shouldInclude = true;
      analysis.reason = 'Has extracted content from API';
    }

    // Include placeholder content for closed toggles
    if (analysis.isPlaceholder && analysis.hasTitle) {
      analysis.shouldInclude = true;
      analysis.reason = 'Placeholder for closed toggle with title';
    }

    return analysis;
  }

  // More lenient content significance check
  private hasSignificantContentLenient(content: string): boolean {
    if (!content || content.trim().length < 5) {
      return false;
    }
    
    // Remove common empty patterns but be more lenient
    const cleanContent = content
      .replace(/🔽\s*[^\n]*\n/g, '') // Remove toggle titles
      .replace(/#+\s*[^\n]*\n/g, '') // Remove headings
      .replace(/[-•]\s*\n/g, '') // Remove empty list items
      .replace(/\[\s*\]\s*\n/g, '') // Remove empty checkboxes
      .replace(/>\s*\n/g, '') // Remove empty quotes
      .replace(/```\s*```/g, '') // Remove empty code blocks
      .replace(/---\s*/g, '') // Remove dividers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Much more lenient - just need some actual text
    const words = cleanContent.split(/\s+/).filter(word => 
      word.length > 1 && // More than 1 character
      !/^[^\w]*$/.test(word) // Not just punctuation
    );
    
    console.log(`Lenient content analysis: ${cleanContent.length} clean chars, ${words.length} words`);
    console.log(`Sample: "${cleanContent.substring(0, 50)}..."`);
    
    return words.length >= 3; // Just need 3 meaningful words
  }

  // Extract content by sections (headings)
  private extractSectionContent(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const sections = [];
    let currentSection = { heading: '', content: '', blocks: [] as any[] };
    
    for (const block of blocks) {
      if (['heading_1', 'heading_2', 'heading_3'].includes(block.type)) {
        // Save previous section if it has content
        if (currentSection.heading && currentSection.content.trim().length > 50) {
          sections.push({
            id: `${pageId}_section_${sections.length}`,
            title: `${pageTitle} → ${currentSection.heading}`,
            content: currentSection.content,
            type: 'section',
            sectionTitle: currentSection.heading,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'section',
            wordCount: currentSection.content.split(/\s+/).length,
          });
        }
        
        // Start new section
        const headingText = this.extractRichText(block[block.type]?.rich_text || []);
        currentSection = { heading: headingText, content: '', blocks: [] };
      } else {
        // Add content to current section
        const blockText = this.extractTextFromBlocks([block]);
        if (blockText.trim()) {
          currentSection.content += blockText + '\n';
          currentSection.blocks.push(block);
        }
      }
    }
    
    // Don't forget the last section
    if (currentSection.heading && currentSection.content.trim().length > 50) {
      sections.push({
        id: `${pageId}_section_${sections.length}`,
        title: `${pageTitle} → ${currentSection.heading}`,
        content: currentSection.content,
        type: 'section',
        sectionTitle: currentSection.heading,
        parentPage: pageTitle,
        lastEdited: lastEdited,
        url: url,
        contentType: 'section',
        wordCount: currentSection.content.split(/\s+/).length,
      });
    }
    
    return sections;
  }

  // Extract individual list items
  private extractListContent(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const listItems = [];
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type)) {
        const itemText = this.extractRichText(block[block.type]?.rich_text || []);
        
        if (itemText.trim().length > 20) { // Minimum meaningful content
          listItems.push({
            id: `${block.id}_listitem`,
            title: `${pageTitle} → ${itemText.substring(0, 50)}...`,
            content: itemText,
            type: 'list_item',
            listType: block.type,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'list_item',
            wordCount: itemText.split(/\s+/).length,
            isCompleted: block.type === 'to_do' ? block.to_do?.checked : undefined,
          });
        }
      }
    }
    
    return listItems;
  }

  // Extract callouts and quotes
  private extractHighlightContent(blocks: any[], pageTitle: string, pageId: string, lastEdited: string, url: string): any[] {
    const highlights = [];
    
    for (const block of blocks) {
      if (['callout', 'quote'].includes(block.type)) {
        const highlightText = this.extractRichText(block[block.type]?.rich_text || []);
        
        if (highlightText.trim().length > 30) {
          highlights.push({
            id: `${block.id}_highlight`,
            title: `${pageTitle} → ${block.type === 'callout' ? '📝' : '💬'} ${highlightText.substring(0, 50)}...`,
            content: highlightText,
            type: block.type,
            parentPage: pageTitle,
            lastEdited: lastEdited,
            url: url,
            contentType: 'highlight',
            wordCount: highlightText.split(/\s+/).length,
          });
        }
      }
    }
    
    return highlights;
  }

  private extractPageTitle(pageDetails: any): string {
    // Try to extract title from properties
    if (pageDetails.properties) {
      // Look for title property
      const titleProp = Object.values(pageDetails.properties).find(
        (prop: any) => prop.type === 'title'
      ) as any;
      
      if (titleProp?.title?.[0]?.plain_text) {
        return titleProp.title[0].plain_text;
      }
    }
    
    // Fallback to extracting from parent or using default
    return 'Untitled Page';
  }
}

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  // Always use current origin in browser environment for maximum compatibility
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/auth/notion/callback`;
    
    console.log('NotionOAuth Environment Debug:', {
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
      mode: import.meta.env.MODE,
      currentOrigin,
      redirectUri,
      devRedirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI,
      prodRedirectUri: import.meta.env.VITE_NOTION_REDIRECT_URI_PROD,
    });
    
    console.log('NotionOAuth: Using dynamic redirect URI:', redirectUri);
    return redirectUri;
  }
  
  // Server-side fallback (shouldn't be used in browser)
  if (import.meta.env.PROD) {
    const prodUri = import.meta.env.VITE_NOTION_REDIRECT_URI_PROD || 'https://nemory.vercel.app/auth/notion/callback';
    console.log('NotionOAuth: Using server-side production URI:', prodUri);
    return prodUri;
  } else {
    const devUri = import.meta.env.VITE_NOTION_REDIRECT_URI || 'http://localhost:8080/auth/notion/callback';
    console.log('NotionOAuth: Using server-side development URI:', devUri);
    return devUri;
  }
};

// Initialize the Notion OAuth service
const redirectUri = getRedirectUri();
console.log('NotionOAuth: Initializing with redirect URI:', redirectUri);

export const notionOAuth = new NotionOAuthService({
  clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_NOTION_CLIENT_SECRET || '',
  redirectUri: redirectUri,
});