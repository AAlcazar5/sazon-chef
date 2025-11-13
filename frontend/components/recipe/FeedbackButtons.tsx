import { View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';

// Interfaces for this component
interface FeedbackButtonsProps {
  recipeId: string;
  onLike?: (recipeId: string) => void;
  onDislike?: (recipeId: string) => void;
  initialLiked?: boolean;
  initialDisliked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface FeedbackState {
  liked: boolean;
  disliked: boolean;
}

export default function FeedbackButtons({ 
  recipeId, 
  onLike, 
  onDislike, 
  initialLiked = false, 
  initialDisliked = false,
  size = 'md'
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({
    liked: initialLiked,
    disliked: initialDisliked
  });

  const sizeClasses = {
    sm: {
      container: 'p-1',
      iconSize: IconSizes.SM
    },
    md: {
      container: 'p-2',
      iconSize: IconSizes.MD
    },
    lg: {
      container: 'p-3',
      iconSize: IconSizes.LG
    }
  };

  const handleLike = () => {
    const newState = {
      liked: !feedback.liked,
      disliked: false // Can't like and dislike at the same time
    };
    
    // Haptic feedback on press - immediate tactile response
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setFeedback(newState);
    
    // Call parent callback if provided
    if (newState.liked && onLike) {
      onLike(recipeId);
    }
  };

  const handleDislike = () => {
    const newState = {
      liked: false, // Can't like and dislike at the same time
      disliked: !feedback.disliked
    };
    
    // Haptic feedback on press - immediate tactile response
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setFeedback(newState);
    
    // Call parent callback if provided
    if (newState.disliked && onDislike) {
      onDislike(recipeId);
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <View className="flex-row space-x-1">
      {/* Dislike Button */}
      <TouchableOpacity
        onPress={handleDislike}
        className={`
          ${currentSize.container} 
          rounded-full 
          ${feedback.disliked 
            ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }
        `}
      >
        <Icon 
          name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} 
          size={currentSize.iconSize} 
          color={feedback.disliked ? "#EF4444" : "#6B7280"}
          accessibilityLabel={feedback.disliked ? "Disliked" : "Dislike recipe"}
        />
      </TouchableOpacity>

      {/* Like Button */}
      <TouchableOpacity
        onPress={handleLike}
        className={`
          ${currentSize.container} 
          rounded-full 
          ${feedback.liked 
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }
        `}
      >
        <Icon 
          name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} 
          size={currentSize.iconSize} 
          color={feedback.liked ? "#10B981" : "#6B7280"}
          accessibilityLabel={feedback.liked ? "Liked" : "Like recipe"}
        />
      </TouchableOpacity>
    </View>
  );
}