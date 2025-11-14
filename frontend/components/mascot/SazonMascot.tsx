import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';

export type SazonExpression = 'happy' | 'excited' | 'curious' | 'proud' | 'supportive' | 'celebrating' | 'thinking' | 'surprised' | 'winking' | 'focused' | 'sleepy' | 'chef-kiss';
export type SazonSize = 'tiny' | 'small' | 'medium' | 'large' | 'hero';
export type SazonVariant = 'orange' | 'red';

interface SazonMascotProps {
  expression?: SazonExpression;
  size?: SazonSize;
  variant?: SazonVariant;
  style?: any;
}

const SIZE_MAP: Record<SazonSize, number> = {
  tiny: 24,
  small: 48,
  medium: 96,
  large: 192,
  hero: 256,
};

export default function SazonMascot({
  expression = 'happy',
  size = 'medium',
  variant = 'orange',
  style,
}: SazonMascotProps) {
  const dimensions = SIZE_MAP[size];
  
  // Color gradients based on variant
  const gradientColors = variant === 'red' 
    ? {
        start: '#EF4444', // red-500
        mid: '#F87171',  // red-400
        end: '#DC2626',  // red-600
      }
    : {
        start: '#F97316', // orange-500
        mid: '#FB923C',   // orange-400
        end: '#EA580C',   // orange-600
      };

  return (
    <View style={[styles.container, { width: dimensions, height: dimensions }, style]}>
      <Svg
        width={dimensions}
        height={dimensions}
        viewBox="0 0 192 192"
        style={styles.svg}
      >
        <Defs>
          {/* Gradient for habanero body (orange or red) */}
          <LinearGradient id="habaneroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
            <Stop offset="50%" stopColor={gradientColors.mid} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
          </LinearGradient>
          
          {/* Highlight gradient */}
          <LinearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <G>
          {/* Habanero Body - Authentic pepper shape (lantern-like, wider shoulders, tapers to point with slight curve) */}
          <G id="habaneroBody">
            {/* Main body shape - authentic habanero: wider at top (shoulders), tapers to sharp point with slight bottom curve */}
            <Path
              d="M 96,55 Q 120,55 135,70 Q 145,85 142,100 Q 140,110 135,120 Q 130,130 122,140 Q 112,150 100,158 Q 98,160 96,162 Q 94,160 88,150 Q 78,140 68,130 Q 63,120 58,110 Q 56,100 53,85 Q 63,70 78,55 L 96,55 Z"
              fill="url(#habaneroGradient)"
            />
            
            {/* Highlight for dimension - left side highlight */}
            <Path
              d="M 96,55 Q 120,55 135,70 Q 145,85 142,100 Q 140,110 135,120 Q 130,130 122,140 Q 112,150 100,158 Q 98,160 96,162 Q 94,160 88,150 Q 78,140 68,130 Q 63,120 58,110 Q 56,100 53,85 Q 63,70 78,55 L 96,55 Z"
              fill="url(#highlightGradient)"
            />
            
            {/* Subtle texture lines for pepper ridges */}
            <Path
              d="M 70 80 Q 96 90, 122 80"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="1.5"
              fill="none"
              opacity="0.3"
            />
            <Path
              d="M 75 100 Q 96 110, 117 100"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="1.5"
              fill="none"
              opacity="0.3"
            />
          </G>

          {/* Chef Hat - Proper toque blanche positioned off to the right side of the pepper's head */}
          <G id="chefHat" transform="rotate(30, 132, 68)">
            {/* Hat band - cylindrical base, sits flush on pepper head */}
            <Path
              d="M 112 68 
                 L 112 75 
                 Q 114 77, 122 77 
                 L 142 77 
                 Q 150 77, 152 75 
                 L 152 68 
                 Q 150 66, 142 66 
                 L 122 66 
                 Q 114 66, 112 68 Z"
              fill="#FFFFFF"
              opacity="0.98"
            />
            {/* Hat band stripe (color matches variant) */}
            <Ellipse
              cx="132"
              cy="75"
              rx="20"
              ry="2.5"
              fill={variant === 'red' ? '#EF4444' : '#F97316'}
              opacity="0.6"
            />
            
            {/* Puffy top - main body with pleats, right side droops more */}
            {/* Center pleat - right side droops significantly */}
            <Path
              d="M 132 20 
                 Q 134 15, 138 17 
                 Q 141 20, 140 30 
                 Q 139 45, 138 58 
                 Q 136 72, 132 68 
                 Q 128 66, 127 58 
                 Q 126 45, 125 30 
                 Q 124 20, 127 17 
                 Q 130 15, 132 20 Z"
              fill="#FFFFFF"
              opacity="0.98"
            />
            {/* Left pleat - more upright */}
            <Path
              d="M 122 25 
                 Q 119 22, 115 25 
                 Q 112 28, 113 38 
                 Q 114 50, 117 63 
                 Q 119 68, 122 68 
                 Q 125 66, 124 58 
                 Q 123 48, 122 35 
                 Q 121 25, 122 25 Z"
              fill="#F3F4F6"
              opacity="0.95"
            />
            {/* Right pleat - heavily drooping due to gravity */}
            <Path
              d="M 142 30 
                 Q 145 28, 149 32 
                 Q 152 38, 151 52 
                 Q 150 68, 147 78 
                 Q 145 82, 142 80 
                 Q 139 76, 140 64 
                 Q 141 52, 142 42 
                 Q 142 30, 142 30 Z"
              fill="#F3F4F6"
              opacity="0.95"
            />
            
            {/* Shadow/depth lines for pleats */}
            <Path
              d="M 122 30 Q 122 40, 122 63"
              stroke="#E5E7EB"
              strokeWidth="1"
              fill="none"
              opacity="0.5"
            />
            <Path
              d="M 132 20 Q 132 40, 132 68"
              stroke="#E5E7EB"
              strokeWidth="1"
              fill="none"
              opacity="0.5"
            />
            <Path
              d="M 142 35 Q 143 50, 144 75"
              stroke="#E5E7EB"
              strokeWidth="1"
              fill="none"
              opacity="0.5"
            />
            
            {/* Top gather/puff - leaning heavily to the right */}
            <Ellipse
              cx="138"
              cy="24"
              rx="13"
              ry="8"
              fill="#F9FAFB"
              opacity="0.9"
              transform="rotate(20, 138, 24)"
            />
          </G>

          {/* Stem/Calyx - Realistic chili pepper stem, positioned at left pointy part */}
          <G id="stem" transform="rotate(-35, 70, 58)">
            {/* Calyx - leafy star-shaped base where stem meets pepper */}
            <G id="calyx">
              {/* Calyx leaf 1 - left */}
              <Path
                d="M 70 58 Q 64 56 62 58 Q 64 60 67 60 Z"
                fill="#15803D"
                opacity="0.9"
              />
              {/* Calyx leaf 2 - top */}
              <Path
                d="M 70 58 Q 69 52 70 48 Q 71 52 71 56 Z"
                fill="#15803D"
                opacity="0.9"
              />
              {/* Calyx leaf 3 - right */}
              <Path
                d="M 70 58 Q 76 56 78 58 Q 76 60 73 60 Z"
                fill="#15803D"
                opacity="0.9"
              />
              {/* Calyx leaf 4 - bottom left */}
              <Path
                d="M 70 58 Q 68 61 66 63 Q 68 61 69 60 Z"
                fill="#166534"
                opacity="0.85"
              />
              {/* Calyx leaf 5 - bottom right */}
              <Path
                d="M 70 58 Q 72 61 74 63 Q 72 61 71 60 Z"
                fill="#166534"
                opacity="0.85"
              />
            </G>
            
            {/* Stem base - wider at bottom where it attaches */}
            <Ellipse
              cx="70"
              cy="57"
              rx="6"
              ry="3"
              fill="#166534"
              opacity="0.95"
            />
            
            {/* Main stem - woody, tapered with curved top */}
            <Path
              d="M 65 55 
                 Q 65 48, 66 38 
                 Q 67 28, 67 20 
                 Q 67 15, 65 12 
                 Q 63 10, 60 11 
                 Q 62 13, 64 16 
                 Q 66 18, 68 20 
                 Q 71 28, 72 38 
                 Q 73 48, 73 55 
                 Q 72 57, 70 58 
                 Q 68 57, 65 55 Z"
              fill="#166534"
              opacity="0.95"
            />
            
            {/* Stem highlight - adds dimension, follows curve */}
            <Path
              d="M 66 55 
                 Q 66 48, 67 38 
                 Q 68 28, 67.5 20 
                 Q 67 15, 65 12"
              stroke="#22C55E"
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
            
            {/* Stem shadow - adds depth, follows curve */}
            <Path
              d="M 72 55 
                 Q 72 48, 71 38 
                 Q 70 28, 69 20 
                 Q 68 15, 66 13"
              stroke="#14532D"
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
            
            {/* Stem tip - bulbous end at curve */}
            <Ellipse
              cx="60"
              cy="11"
              rx="2.5"
              ry="3"
              fill="#14532D"
              opacity="0.95"
            />
          </G>

          {/* Arms - Attached to pepper body */}
          <G id="arms">
            {/* Left arm - attached at shoulder */}
            <Path
              d="M 70 100 
                 Q 55 105, 45 120
                 Q 40 130, 42 138
                 Q 44 145, 50 142"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right arm holding spatula - attached at shoulder */}
            <Path
              d="M 122 100 
                 Q 137 105, 147 120
                 Q 152 130, 150 138
                 Q 148 145, 142 142"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Spatula in right hand */}
            <G id="spatula">
              {/* Spatula handle */}
              <Path
                d="M 142 140 L 170 160"
                stroke="#8B4513"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Spatula head - medium size */}
              <Ellipse
                cx="178"
                cy="167"
                rx="16.5"
                ry="12"
                fill="#F3F4F6"
                stroke="#8B4513"
                strokeWidth="2.5"
              />
            </G>
          </G>

          {/* Legs - Attached to bottom of pepper */}
          <G id="legs">
            {/* Left leg */}
            <Path
              d="M 88 155 
                 Q 85 165, 82 175
                 Q 80 185, 82 192"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right leg */}
            <Path
              d="M 104 155 
                 Q 107 165, 110 175
                 Q 112 185, 110 192"
              stroke={variant === 'red' ? '#DC2626' : '#EA580C'}
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Feet */}
            <Ellipse cx="82" cy="192" rx="5" ry="3" fill={variant === 'red' ? '#DC2626' : '#EA580C'} />
            <Ellipse cx="110" cy="192" rx="5" ry="3" fill={variant === 'red' ? '#DC2626' : '#EA580C'} />
          </G>

          {/* Face - Expression varies */}
          <G id="face">
            {renderExpression(expression)}
          </G>
        </G>
      </Svg>
    </View>
  );
}

function renderExpression(expression: SazonExpression) {
  switch (expression) {
    case 'happy':
      return (
        <>
          {/* Friendly eyes - larger whites, smaller pupils for cuteness */}
          {/* Left eye white */}
          <Ellipse cx="80" cy="105" rx="14" ry="16" fill="#FFFFFF" />
          {/* Right eye white */}
          <Ellipse cx="112" cy="105" rx="14" ry="16" fill="#FFFFFF" />
          {/* Left eye pupil */}
          <Circle cx="80" cy="105" r="8" fill="#1F2937" />
          {/* Right eye pupil */}
          <Circle cx="112" cy="105" r="8" fill="#1F2937" />
          {/* Eye highlights - larger and more prominent */}
          <Circle cx="82" cy="102" r="3.5" fill="#FFFFFF" />
          <Circle cx="114" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Warm smile - wider and friendlier */}
          <Path
            d="M 70 125 Q 96 145, 122 125"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Rosy cheeks - more visible */}
          <Ellipse cx="58" cy="120" rx="8" ry="5" fill="#FB7185" opacity="0.5" />
          <Ellipse cx="134" cy="120" rx="8" ry="5" fill="#FB7185" opacity="0.5" />
        </>
      );
    
    case 'excited':
      return (
        <>
          {/* Wide open eyes with whites */}
          <Ellipse cx="80" cy="105" rx="16" ry="18" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="16" ry="18" fill="#FFFFFF" />
          {/* Pupils - smaller for excited look */}
          <Circle cx="80" cy="105" r="7" fill="#1F2937" />
          <Circle cx="112" cy="105" r="7" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="82" cy="102" r="4" fill="#FFFFFF" />
          <Circle cx="114" cy="102" r="4" fill="#FFFFFF" />
          {/* Big excited smile */}
          <Path
            d="M 65 125 Q 96 155, 127 125"
            stroke="#1F2937"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Teeth showing */}
          <Path
            d="M 85 130 L 89 135 L 96 130 L 103 135 L 107 130"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            fill="none"
          />
        </>
      );
    
    case 'curious':
      return (
        <>
          {/* Curious eyes with whites */}
          <Ellipse cx="80" cy="105" rx="13" ry="15" fill="#FFFFFF" transform="rotate(-3 80 105)" />
          <Ellipse cx="112" cy="105" rx="13" ry="15" fill="#FFFFFF" transform="rotate(3 112 105)" />
          {/* Pupils */}
          <Circle cx="80" cy="105" r="7" fill="#1F2937" transform="rotate(-3 80 105)" />
          <Circle cx="112" cy="105" r="7" fill="#1F2937" transform="rotate(3 112 105)" />
          {/* Eye highlights */}
          <Circle cx="81" cy="102" r="3.5" fill="#FFFFFF" />
          <Circle cx="113" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Slight smile with curiosity */}
          <Path
            d="M 73 125 Q 96 135, 119 125"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* One eyebrow raised */}
          <Path
            d="M 68 95 Q 78 90, 88 95"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    
    case 'proud':
      return (
        <>
          {/* Confident eyes with whites */}
          <Ellipse cx="80" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          {/* Pupils */}
          <Circle cx="80" cy="105" r="7" fill="#1F2937" />
          <Circle cx="112" cy="105" r="7" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="82" cy="102" r="3.5" fill="#FFFFFF" />
          <Circle cx="114" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Confident smile */}
          <Path
            d="M 70 125 Q 96 140, 122 125"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Slight wink (one eye closed) */}
          <Path
            d="M 68 105 Q 78 105, 88 105"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    
    case 'supportive':
      return (
        <>
          {/* Gentle, kind eyes with whites */}
          <Ellipse cx="80" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          {/* Pupils */}
          <Circle cx="80" cy="105" r="7" fill="#1F2937" />
          <Circle cx="112" cy="105" r="7" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="82" cy="102" r="3.5" fill="#FFFFFF" />
          <Circle cx="114" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Warm, supportive smile */}
          <Path
            d="M 71 125 Q 96 140, 121 125"
            stroke="#1F2937"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Gentle expression lines */}
          <Path
            d="M 68 100 Q 73 98, 80 100"
            stroke="#1F2937"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <Path
            d="M 112 100 Q 117 98, 124 100"
            stroke="#1F2937"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
        </>
      );
    
    case 'celebrating':
      return (
        <>
          {/* Joyful eyes with whites */}
          <Ellipse cx="80" cy="105" rx="15" ry="17" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="15" ry="17" fill="#FFFFFF" />
          {/* Pupils */}
          <Circle cx="80" cy="105" r="8" fill="#1F2937" />
          <Circle cx="112" cy="105" r="8" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="83" cy="102" r="4.5" fill="#FFFFFF" />
          <Circle cx="115" cy="102" r="4.5" fill="#FFFFFF" />
          {/* Big celebratory smile */}
          <Path
            d="M 63 125 Q 96 160, 129 125"
            stroke="#1F2937"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Confetti/sparkles around (simplified) */}
          <Circle cx="50" cy="95" r="2.5" fill="#FBBF24" />
          <Circle cx="142" cy="95" r="2.5" fill="#8B5CF6" />
          <Circle cx="45" cy="135" r="2.5" fill="#10B981" />
          <Circle cx="147" cy="135" r="2.5" fill="#EF4444" />
        </>
      );
    
    case 'thinking':
      return (
        <>
          {/* Thoughtful eyes with whites */}
          <Ellipse cx="80" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          {/* Pupils looking up/left */}
          <Circle cx="78" cy="102" r="7" fill="#1F2937" />
          <Circle cx="110" cy="102" r="7" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="79" cy="100" r="3.5" fill="#FFFFFF" />
          <Circle cx="111" cy="100" r="3.5" fill="#FFFFFF" />
          {/* Neutral/contemplative mouth */}
          <Path
            d="M 75 125 Q 96 130, 117 125"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Hand on chin gesture (simplified as a line) */}
          <Path
            d="M 65 120 Q 70 125, 75 120"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </>
      );
    
    case 'surprised':
      return (
        <>
          {/* Wide surprised eyes with whites */}
          <Ellipse cx="80" cy="100" rx="14" ry="18" fill="#FFFFFF" />
          <Ellipse cx="112" cy="100" rx="14" ry="18" fill="#FFFFFF" />
          {/* Small pupils - surprised look */}
          <Circle cx="80" cy="100" r="5" fill="#1F2937" />
          <Circle cx="112" cy="100" r="5" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="81" cy="97" r="2.5" fill="#FFFFFF" />
          <Circle cx="113" cy="97" r="2.5" fill="#FFFFFF" />
          {/* O-shaped surprised mouth */}
          <Ellipse cx="96" cy="130" rx="8" ry="10" fill="#1F2937" />
          <Ellipse cx="96" cy="130" rx="5" ry="7" fill="#FFFFFF" />
          {/* Raised eyebrows */}
          <Path
            d="M 68 90 Q 80 85, 92 90"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 100 90 Q 112 85, 124 90"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    
    case 'winking':
      return (
        <>
          {/* Left eye open with whites */}
          <Ellipse cx="80" cy="105" rx="14" ry="16" fill="#FFFFFF" />
          <Circle cx="80" cy="105" r="8" fill="#1F2937" />
          <Circle cx="82" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Right eye closed (winking) */}
          <Path
            d="M 100 105 Q 112 105, 124 105"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Playful smile */}
          <Path
            d="M 70 125 Q 96 145, 122 125"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Rosy cheeks */}
          <Ellipse cx="58" cy="120" rx="8" ry="5" fill="#FB7185" opacity="0.5" />
          <Ellipse cx="134" cy="120" rx="8" ry="5" fill="#FB7185" opacity="0.5" />
        </>
      );
    
    case 'focused':
      return (
        <>
          {/* Focused, determined eyes with whites */}
          <Ellipse cx="80" cy="105" rx="12" ry="14" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="12" ry="14" fill="#FFFFFF" />
          {/* Pupils - focused look */}
          <Circle cx="80" cy="105" r="6" fill="#1F2937" />
          <Circle cx="112" cy="105" r="6" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="81" cy="103" r="3" fill="#FFFFFF" />
          <Circle cx="113" cy="103" r="3" fill="#FFFFFF" />
          {/* Determined, straight mouth */}
          <Path
            d="M 75 125 L 117 125"
            stroke="#1F2937"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Slight furrowed brow */}
          <Path
            d="M 70 95 Q 80 92, 90 95"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
          <Path
            d="M 102 95 Q 112 92, 122 95"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </>
      );
    
    case 'sleepy':
      return (
        <>
          {/* Sleepy, half-closed eyes with whites */}
          <Ellipse cx="80" cy="108" rx="12" ry="8" fill="#FFFFFF" />
          <Ellipse cx="112" cy="108" rx="12" ry="8" fill="#FFFFFF" />
          {/* Small pupils */}
          <Circle cx="80" cy="108" r="5" fill="#1F2937" />
          <Circle cx="112" cy="108" r="5" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="81" cy="107" r="2.5" fill="#FFFFFF" />
          <Circle cx="113" cy="107" r="2.5" fill="#FFFFFF" />
          {/* Sleepy smile */}
          <Path
            d="M 72 125 Q 96 135, 120 125"
            stroke="#1F2937"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Zzz bubbles */}
          <Path
            d="M 50 90 Q 45 85, 50 80 Q 55 85, 50 90"
            stroke="#1F2937"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
          <Path
            d="M 142 90 Q 137 85, 142 80 Q 147 85, 142 90"
            stroke="#1F2937"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      );
    
    case 'chef-kiss':
      return (
        <>
          {/* Satisfied eyes with whites */}
          <Ellipse cx="80" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          <Ellipse cx="112" cy="105" rx="13" ry="15" fill="#FFFFFF" />
          {/* Pupils */}
          <Circle cx="80" cy="105" r="7" fill="#1F2937" />
          <Circle cx="112" cy="105" r="7" fill="#1F2937" />
          {/* Eye highlights */}
          <Circle cx="82" cy="102" r="3.5" fill="#FFFFFF" />
          <Circle cx="114" cy="102" r="3.5" fill="#FFFFFF" />
          {/* Chef's kiss gesture - one eye closed */}
          <Path
            d="M 100 105 Q 112 105, 124 105"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Satisfied smile */}
          <Path
            d="M 70 125 Q 96 145, 122 125"
            stroke="#1F2937"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Kiss gesture - hand/fingers */}
          <Path
            d="M 130 115 Q 138 110, 145 115"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
          <Path
            d="M 130 120 Q 138 115, 145 120"
            stroke="#1F2937"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      );
    
    default:
      return renderExpression('happy');
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    flex: 1,
  },
});

