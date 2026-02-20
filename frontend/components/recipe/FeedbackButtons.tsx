import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

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

function FeedbackButtons({
  recipeId, 
  onLike, 
  onDislike, 
  initialLiked = false, 
  initialDisliked = false,
  size = 'md'
}: FeedbackButtonsProps) {
  const colorScheme = useColorScheme();
  const [feedback, setFeedback] = useState<FeedbackState>({
    liked: initialLiked,
    disliked: initialDisliked
  });

  const sizeClasses = {
    sm: {
      container: 'p-2',
      iconSize: IconSizes.MD
    },
    md: {
      container: 'p-2',
      iconSize: IconSizes.MD
    },
    lg: {
      container: 'p-2',
      iconSize: IconSizes.MD
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
    <View className="flex-row">
      {/* Dislike Button */}
      <TouchableOpacity
        onPress={handleDislike}
        className={`
          ${currentSize.container} 
          rounded-full 
          mr-2
          ${feedback.disliked 
            ? 'bg-red-600 dark:bg-red-400 border border-red-600 dark:border-red-500' 
            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }
        `}
      >
        <Icon 
          name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} 
          size={currentSize.iconSize} 
          color={feedback.disliked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")}
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
            ? 'bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-700' 
            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }
        `}
      >
        <Icon 
          name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} 
          size={currentSize.iconSize} 
          color={feedback.liked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")}
          accessibilityLabel={feedback.liked ? "Liked" : "Like recipe"}
        />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(FeedbackButtons);