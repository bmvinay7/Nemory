import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotion } from '@/contexts/NotionContext';
import { notionOAuth } from '@/lib/notion';
import { aiSummarizationService, SummaryOptions, SummaryResult } from '@/lib/ai-summarization';
import { summaryStorageService, SummaryPreferences } from '@/lib/summary-storage';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Settings, 
  Play,
  History,
  Download,
  Trash2
} from 'lucide-react';

const AISummarization: React.FC = () => {
  const { currentUser } = useAuth();
  const { integration, isConnected } = useNotion();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<SummaryResult | null>(null);
  const [summaryHistory, setSummaryHistory] = useState<SummaryResult[]>([]);
  const [preferences, setPreferences] = useState<SummaryPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  const loadUserPreferences = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingPreferences(true);
      const userPrefs = await summaryStorageService.getUserPreferences(currentUser.uid);
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      toast({
        title: "Error loading preferences",
        description: "Using default settings",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [currentUser]);

  const loadSummaryHistory = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const history = await summaryStorageService.getUserSummaries(currentUser.uid, 10);
      setSummaryHistory(history);
    } catch (error) {
      console.error('Failed to load summary history:', error);
    }
  }, [currentUser]);

  // Run effect after callbacks are defined to avoid TDZ errors
  useEffect(() => {
    if (currentUser) {
      loadUserPreferences();
      loadSummaryHistory();
    }
  }, [currentUser, loadUserPreferences, loadSummaryHistory]);

  const savePreferences = async (newPreferences: Partial<SummaryPreferences>) => {
    if (!currentUser || !preferences) return;
    
    try {
      const updatedPreferences: SummaryPreferences = {
        ...preferences,
        ...newPreferences,
        updatedAt: new Date().toISOString(),
      };
      
      await summaryStorageService.saveUserPreferences(updatedPreferences);
      setPreferences(updatedPreferences);
      
      toast({
        title: "Preferences saved",
        description: "Your summarization preferences have been updated",
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error saving preferences",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const generateSummary = async () => {
    if (!currentUser || !integration || !preferences) {
      toast({
        title: "Unable to generate summary",
        description: "Please ensure you're logged in and connected to Notion",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Fetch content from Notion
      const notionContent = await notionOAuth.getContentForAI(integration.accessToken, 7);
      
      if (notionContent.length === 0) {
        toast({
          title: "No content found",
          description: "No recent content found in your Notion workspace",
        });
        return;
      }

      // Prepare summarization options
      const options: SummaryOptions = {
        style: preferences.style,
        length: preferences.length,
        focus: preferences.focus,
        includeActionItems: preferences.includeActionItems,
        includePriority: preferences.includePriority,
      };

      // Generate smart summary (selects one note intelligently)
      const summary = await aiSummarizationService.smartSummarizeContent(
        notionContent,
        options,
        currentUser.uid
      );

      // Save summary
      await summaryStorageService.saveSummary(summary);
      
      setCurrentSummary(summary);
      await loadSummaryHistory(); // Refresh history

      toast({
        title: "Summary generated successfully!",
        description: `Processed ${notionContent.length} pages from your Notion workspace`,
      });

    } catch (error: unknown) {
      console.error('Failed to generate summary:', error);
      toast({
        title: "Failed to generate summary",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteSummary = async (summaryId: string) => {
    if (!currentUser) return;
    
    try {
      await summaryStorageService.deleteSummary(summaryId, currentUser.uid);
      
      if (currentSummary?.id === summaryId) {
        setCurrentSummary(null);
      }
      
      await loadSummaryHistory();
      
      toast({
        title: "Summary deleted",
        description: "The summary has been removed from your history",
      });
    } catch (error) {
      console.error('Failed to delete summary:', error);
      toast({
        title: "Error deleting summary",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  interface ActionItem {
    text: string;
    priority: string;
    dueDate?: string;
    category: string;
  }

  const formatActionItems = (actionItems: ActionItem[]) => {
    const grouped = actionItems.reduce((acc: Record<string, ActionItem[]>, item) => {
      if (!acc[item.priority]) acc[item.priority] = [];
      acc[item.priority].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([priority, items]: [string, ActionItem[]]) => (
      <div key={priority} className="mb-4">
        <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
          {priority} Priority ({items.length})
        </h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-800">{item.text}</p>
                {item.dueDate && (
                  <p className="text-xs text-gray-500 mt-1">Due: {item.dueDate}</p>
                )}
                <Badge variant="outline" className="mt-1 text-xs">
                  {item.category}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-pulse-500" />
            <span>AI Summarization</span>
          </CardTitle>
          <CardDescription>
            Connect your Notion workspace to start generating AI-powered summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Please connect your Notion workspace to use AI summarization features
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-pulse-500" />
            <span>AI Summarization</span>
          </CardTitle>
          <CardDescription>
            Generate intelligent summaries from your Notion content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Connected to {integration?.workspaceName}</p>
                <p className="text-sm text-gray-600">Ready to generate summaries</p>
              </div>
            </div>
            <Button 
              onClick={generateSummary} 
              disabled={isGenerating}
              className="flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Generate Summary</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Summary</TabsTrigger>
          <TabsTrigger value="settings">Preferences</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentSummary ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Latest Summary</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {currentSummary.readingTime} min read
                    </Badge>
                    <Badge variant={
                      currentSummary.priority === 'high' ? 'destructive' :
                      currentSummary.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {currentSummary.priority} priority
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Generated on {new Date(currentSummary.createdAt).toLocaleDateString()}
                  {' • '}
                  {currentSummary.wordCount} words
                  {' • '}
                  {currentSummary.sourceContent.length} sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tags */}
                  {currentSummary.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentSummary.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Information for All Content Types */}
                  {currentSummary.sourceContent.length > 0 && (currentSummary.sourceContent[0] as any).contentType && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-sm text-blue-800 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Content Source Information
                      </h4>
                      <div className="text-sm text-blue-700">
                        {(() => {
                          const source = currentSummary.sourceContent[0] as any;
                          const contentType = source.contentType;
                          
                          switch (contentType) {
                            case 'toggle':
                              return (
                                <>
                                  <p><strong>Type:</strong> Toggle Content</p>
                                  <p><strong>Page:</strong> {source.parentPage}</p>
                                  <p><strong>Toggle:</strong> {source.toggleTitle}</p>
                                  <p><strong>Description:</strong> Focused Learning Notes</p>
                                </>
                              );
                            case 'section':
                              return (
                                <>
                                  <p><strong>Type:</strong> Document Section</p>
                                  <p><strong>Page:</strong> {source.parentPage}</p>
                                  <p><strong>Section:</strong> {source.sectionTitle}</p>
                                  <p><strong>Description:</strong> Structured Document Content</p>
                                </>
                              );
                            case 'list_item':
                              return (
                                <>
                                  <p><strong>Type:</strong> List Item</p>
                                  <p><strong>Page:</strong> {source.parentPage}</p>
                                  <p><strong>List Type:</strong> {source.listType?.replace('_', ' ')}</p>
                                  {source.isCompleted !== undefined && (
                                    <p><strong>Status:</strong> {source.isCompleted ? 'Completed' : 'Pending'}</p>
                                  )}
                                  <p><strong>Description:</strong> Individual List Item</p>
                                </>
                              );
                            case 'highlight':
                              return (
                                <>
                                  <p><strong>Type:</strong> Highlighted Content</p>
                                  <p><strong>Page:</strong> {source.parentPage}</p>
                                  <p><strong>Highlight Type:</strong> {source.type === 'callout' ? 'Callout' : 'Quote'}</p>
                                  <p><strong>Description:</strong> Important Highlighted Information</p>
                                </>
                              );
                            case 'page':
                            default:
                              return (
                                <>
                                  <p><strong>Type:</strong> Full Page Content</p>
                                  <p><strong>Page:</strong> {source.title}</p>
                                  {source.contentStructure && (
                                    <p><strong>Structure:</strong> {source.contentStructure.primaryContentType} ({source.contentStructure.contentDensity} density)</p>
                                  )}
                                  <p><strong>Description:</strong> Complete Page Analysis</p>
                                </>
                              );
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Summary</h4>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {currentSummary.summary}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Items */}
                  {currentSummary.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-3">
                        Action Items ({currentSummary.actionItems.length})
                      </h4>
                      {formatActionItems(currentSummary.actionItems)}
                    </div>
                  )}

                  {/* Key Insights */}
                  {currentSummary.keyInsights.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-3">Key Insights</h4>
                      <div className="space-y-2">
                        {currentSummary.keyInsights.map((insight, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                            <p className="text-sm text-blue-900">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No summary generated yet</h3>
                <p className="text-gray-600 mb-4">
                  Click "Generate Summary" to create your first AI-powered summary
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Summary Preferences</span>
              </CardTitle>
              <CardDescription>
                Customize how your summaries are generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPreferences ? (
                <div className="text-center py-8">
                  <Zap className="w-8 h-8 text-pulse-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-600">Loading preferences...</p>
                </div>
              ) : preferences ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="style">Summary Style</Label>
                      <Select 
                        value={preferences.style} 
                        onValueChange={(value: string) => savePreferences({ style: value as 'executive' | 'detailed' | 'bullet_points' | 'action_items' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="bullet_points">Bullet Points</SelectItem>
                          <SelectItem value="action_items">Action Items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="length">Summary Length</Label>
                      <Select 
                        value={preferences.length} 
                        onValueChange={(value: string) => savePreferences({ length: value as 'short' | 'medium' | 'long' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium mb-3 block">Focus Areas</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['tasks', 'ideas', 'decisions', 'questions', 'meetings', 'projects'].map((focus) => (
                        <div key={focus} className="flex items-center space-x-2">
                          <Checkbox
                            id={focus}
                            checked={preferences.focus.includes(focus)}
                            onCheckedChange={(checked) => {
                              const newFocus = checked
                                ? [...preferences.focus, focus]
                                : preferences.focus.filter(f => f !== focus);
                              savePreferences({ focus: newFocus });
                            }}
                          />
                          <Label htmlFor={focus} className="capitalize">
                            {focus}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="actionItems"
                        checked={preferences.includeActionItems}
                        onCheckedChange={(checked) => savePreferences({ includeActionItems: !!checked })}
                      />
                      <Label htmlFor="actionItems">Include Action Items</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="priority"
                        checked={preferences.includePriority}
                        onCheckedChange={(checked) => savePreferences({ includePriority: !!checked })}
                      />
                      <Label htmlFor="priority">Include Priority Assessment</Label>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Summary History</span>
              </CardTitle>
              <CardDescription>
                View and manage your previous summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryHistory.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {summaryHistory.map((summary) => (
                      <div
                        key={summary.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              summary.priority === 'high' ? 'destructive' :
                              summary.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {summary.priority}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(summary.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentSummary(summary)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteSummary(summary.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                          {summary.summary.substring(0, 150)}...
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{summary.wordCount} words</span>
                          <span>{summary.readingTime} min read</span>
                          <span>{summary.actionItems.length} actions</span>
                          <span>{summary.sourceContent.length} sources</span>
                        </div>
                        
                        {summary.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {summary.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">No summaries yet</h3>
                  <p className="text-gray-600">
                    Generated summaries will appear here for easy access
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AISummarization;
