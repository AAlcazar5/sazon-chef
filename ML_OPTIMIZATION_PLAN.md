# Machine Learning Optimization Plan

## Overview
This document outlines the plan for implementing ML models to optimize recipe recommendations, starting with a lightweight approach that can scale as data grows.

## Current State

### Available Data
- **Recipe Features**: calories, protein, carbs, fat, fiber, sugar, cookTime, cuisine, difficulty, ingredients, instructions
- **User Behavior**: likes, dislikes, saves, consumed (with timestamps)
- **User Preferences**: banned ingredients, liked cuisines, dietary restrictions, spice level, cookTimePreference
- **User Profile**: macro goals, physical profile (BMR/TDEE), fitness goals

### Current System
- Rule-based scoring algorithms (predictive scoring, collaborative filtering, dynamic weight adjustment)
- Feature engineering already done
- Well-organized data structure

## Recommended Approaches (No Infrastructure Changes Required)

### Option 1: Node.js Native ML (Recommended - No Python needed)
**Libraries**: `@tensorflow/tfjs-node`, `ml-matrix`, `brain.js`
- Train models directly in Node.js
- No separate Python service needed
- Integrate seamlessly with existing backend
- **Pros**: Simple, no infrastructure changes, same language
- **Cons**: Smaller ML ecosystem than Python

### Option 2: Python Microservice (For complex models)
**Architecture**: Separate Python FastAPI service
- Node.js backend calls Python service via HTTP API
- Train models in Python (XGBoost, LightGBM, PyTorch)
- Model inference via REST API
- **Pros**: Full Python ML ecosystem, best models
- **Cons**: Requires separate service, more complex deployment

### Option 3: Hybrid Approach (Best of both worlds)
**Architecture**: Train in Python, serve in Node.js
- Train models in Python (better ML ecosystem)
- Export trained models (TensorFlow.js, ONNX format)
- Serve models in Node.js (no Python runtime needed)
- **Pros**: Best ML tools + no runtime Python dependency
- **Cons**: Slightly more complex setup

## Implementation Phases

### Phase 1: Data Export & Preparation (1-2 days)
- Export recipe features and user interactions to CSV/JSON
- Create training dataset with labels (liked=1, disliked=0, saved=1, etc.)
- Feature engineering from existing features

### Phase 2: Model Training (3-5 days)
- Train model to predict user engagement (choose approach above)
- Features: recipe features + user preferences + user profile
- Target: probability of like/save/consume
- Cross-validation and hyperparameter tuning

### Phase 3: Model Integration (3-5 days)
- Serve models (Node.js native, Python microservice, or hybrid)
- Integrate ML predictions with existing rule-based scoring
- A/B test ML vs rule-based recommendations
- Gradual rollout

### Phase 4: Continuous Learning (Ongoing)
- Retrain model periodically (weekly/monthly)
- Monitor performance metrics
- Update as data grows

## Alternative: Quick Win - ML-Enhanced Weight Optimization

Instead of replacing scoring, use ML to optimize scoring weights:
- Train model to predict which scoring factors correlate with engagement
- Automatically adjust weights (enhance `dynamicWeightAdjustment.ts`)
- Minimal infrastructure needed
- Can be done in Node.js with a simple library

## Estimated Effort

- **Lightweight Approach**: 2-3 weeks
- **Quick Win Approach**: 1 week
- **Medium Approach (Neural CF)**: 3-4 weeks
- **Complex Approach (Deep Learning)**: 6+ weeks

## Infrastructure Requirements

### Option 1: Node.js Native (No changes needed)
- Install ML libraries: `npm install @tensorflow/tfjs-node ml-matrix`
- Use existing Node.js/Express backend
- No infrastructure changes required

### Option 2: Python Microservice (Additional service)
- Set up Python FastAPI service
- Deploy separately (same server or different)
- Node.js calls via HTTP API

### Option 3: Hybrid (Minimal changes)
- Python environment for training (can be local/dev)
- Export models to Node.js-compatible format
- Serve in existing Node.js backend

## Next Steps

1. Wait for sufficient user data (100+ users with 10+ interactions each)
2. Decide on approach (Node.js native, Python microservice, or hybrid)
3. Export training data
4. Train initial model
5. Integrate with existing system
6. A/B test and monitor performance
7. Iterate and retrain periodically

