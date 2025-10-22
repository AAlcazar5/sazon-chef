import { View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

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
      icon: 16
    },
    md: {
      container: 'p-2',
      icon: 20
    },
    lg: {
      container: 'p-3',
      icon: 24
    }
  };

  const handleLike = () => {
    const newState = {
      liked: !feedback.liked,
      disliked: false // Can't like and dislike at the same time
    };
    setFeedback(newState);
    
    if (newState.liked && onLike) {
      onLike(recipeId);
    }
  };

  const handleDislike = () => {
    const newState = {
      liked: false, // Can't like and dislike at the same time
      disliked: !feedback.disliked
    };
    setFeedback(newState);
    
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
            ? 'bg-red-100 border border-red-200' 
            : 'bg-gray-100 border border-gray-200'
          }
        `}
      >
        <Ionicons 
          name={feedback.disliked ? "thumbs-down" : "thumbs-down-outline"} 
          size={currentSize.icon} 
          color={feedback.disliked ? "#EF4444" : "#6B7280"} 
        />
      </TouchableOpacity>

      {/* Like Button */}
      <TouchableOpacity
        onPress={handleLike}
        className={`
          ${currentSize.container} 
          rounded-full 
          ${feedback.liked 
            ? 'bg-green-100 border border-green-200' 
            : 'bg-gray-100 border border-gray-200'
          }
        `}
      >
        <Ionicons 
          name={feedback.liked ? "thumbs-up" : "thumbs-up-outline"} 
          size={currentSize.icon} 
          color={feedback.liked ? "#10B981" : "#6B7280"} 
        />
      </TouchableOpacity>
    </View>
  );
}