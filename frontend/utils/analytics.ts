// Analytics utility that respects user privacy settings
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class AnalyticsService {
  private userId: string | null = null;
  private enabled: boolean = true; // Default to enabled, will be checked on each event
  private eventQueue: AnalyticsEvent[] = [];
  private isProcessing = false;

  /**
   * Initialize analytics service with user ID
   */
  async initialize(userId: string) {
    this.userId = userId;
    await this.checkPrivacySetting();
  }

  /**
   * Check if analytics is enabled for the current user
   */
  private async checkPrivacySetting(): Promise<boolean> {
    try {
      if (!this.userId) {
        this.enabled = false;
        return false;
      }

      const savedSettings = await AsyncStorage.getItem(`privacy_settings_${this.userId}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.enabled = settings.analyticsEnabled !== false; // Default to true if not set
      } else {
        this.enabled = true; // Default to enabled
      }
      return this.enabled;
    } catch (error) {
      console.error('Error checking analytics privacy setting:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Track an analytics event
   */
  async track(event: string, properties?: Record<string, any>) {
    // Check privacy setting before tracking
    const isEnabled = await this.checkPrivacySetting();
    
    if (!isEnabled) {
      return; // Don't track if analytics is disabled
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        platform: 'mobile',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
    };

    // Add to queue
    this.eventQueue.push(analyticsEvent);

    // Process queue (non-blocking)
    this.processQueue();
  }

  /**
   * Process the event queue
   */
  private async processQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Store events locally (could also send to backend)
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Store in AsyncStorage for batch processing
      const existingEvents = await AsyncStorage.getItem(`analytics_events_${this.userId}`);
      const allEvents = existingEvents ? JSON.parse(existingEvents) : [];
      allEvents.push(...events);

      // Keep only last 1000 events to prevent storage bloat
      const recentEvents = allEvents.slice(-1000);
      await AsyncStorage.setItem(`analytics_events_${this.userId}`, JSON.stringify(recentEvents));

      // In production, you could send these to your analytics backend
      // await this.sendToBackend(events);
    } catch (error) {
      console.error('Error processing analytics queue:', error);
      // Re-add events to queue if processing failed
      this.eventQueue.unshift(...events);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send events to backend (optional - for future implementation)
   */
  private async sendToBackend(events: AnalyticsEvent[]) {
    // TODO: Implement backend endpoint for analytics
    // For now, events are stored locally
    console.log(`📊 Analytics: ${events.length} events ready to send`);
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName: string, properties?: Record<string, any>) {
    await this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track button click
   */
  async trackButtonClick(buttonName: string, properties?: Record<string, any>) {
    await this.track('button_click', {
      button_name: buttonName,
      ...properties,
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(featureName: string, properties?: Record<string, any>) {
    await this.track('feature_usage', {
      feature_name: featureName,
      ...properties,
    });
  }

  /**
   * Track recipe interaction
   */
  async trackRecipeInteraction(action: string, recipeId: string, properties?: Record<string, any>) {
    await this.track('recipe_interaction', {
      action,
      recipe_id: recipeId,
      ...properties,
    });
  }

  /**
   * Track meal plan generation
   */
  async trackMealPlanGeneration(type: string, properties?: Record<string, any>) {
    await this.track('meal_plan_generation', {
      plan_type: type,
      ...properties,
    });
  }

  /**
   * Clear analytics data (for privacy)
   */
  async clearAnalyticsData() {
    try {
      if (this.userId) {
        await AsyncStorage.removeItem(`analytics_events_${this.userId}`);
        this.eventQueue = [];
        console.log('📊 Analytics: Data cleared');
      }
    } catch (error) {
      console.error('Error clearing analytics data:', error);
    }
  }

  /**
   * Get analytics summary (for user viewing)
   */
  async getAnalyticsSummary(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    lastEventDate: string | null;
  }> {
    try {
      if (!this.userId) {
        return { totalEvents: 0, eventsByType: {}, lastEventDate: null };
      }

      const existingEvents = await AsyncStorage.getItem(`analytics_events_${this.userId}`);
      if (!existingEvents) {
        return { totalEvents: 0, eventsByType: {}, lastEventDate: null };
      }

      const events: AnalyticsEvent[] = JSON.parse(existingEvents);
      const eventsByType: Record<string, number> = {};
      
      events.forEach(event => {
        eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;
      });

      const lastEvent = events[events.length - 1];

      return {
        totalEvents: events.length,
        eventsByType,
        lastEventDate: lastEvent?.timestamp || null,
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return { totalEvents: 0, eventsByType: {}, lastEventDate: null };
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

