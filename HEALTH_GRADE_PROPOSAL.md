# Health Grade Criteria Proposal

## Overview
A comprehensive health grading system (A-F) that objectively evaluates recipes based on nutritional quality, ingredient quality, and overall healthfulness.

## Scoring Components (Total: 100 points)

### 1. **Macronutrient Balance** (25 points)
**Weight: 25%**

- **Protein Adequacy** (10 points)
  - 20g+ per meal: 10 points
  - 15-19g: 7 points
  - 10-14g: 4 points
  - <10g: 0 points
  
- **Macro Balance** (10 points)
  - Balanced ratios (not extreme in any macro): 10 points
  - Moderate imbalance: 6 points
  - Severe imbalance (>70% of calories from one macro): 2 points
  
- **Fat Quality** (5 points)
  - Lower total fat with higher protein/carb: 5 points
  - Moderate fat: 3 points
  - Very high fat (>40g per meal): 1 point

### 2. **Calorie Density** (20 points)
**Weight: 20%**

- **Appropriate Calorie Range** (15 points)
  - **Meals (300-600 calories)**: 15 points (optimal meal range)
  - **Large Meals (601-750 calories)**: 12 points (slightly high but acceptable)
  - **Snacks/Light Meals (150-299 calories)**: 12 points (appropriate for snacks, protein shakes, etc.)
  - **Very Light (<150 calories)**: 10 points (acceptable for snacks, beverages, supplements)
  - **Heavy Meals (751-900 calories)**: 8 points (high but may be appropriate for some)
  - **Very Heavy (>900 calories)**: 3 points (excessive)
  
- **Calorie-to-Nutrient Ratio** (5 points)
  - **High efficiency** (protein per calorie >0.20 or fiber per calorie >0.03): 5 points
    - Example: 120 cal, 24g protein = 0.20 ratio (excellent)
  - **Moderate efficiency** (0.10-0.20 protein or 0.015-0.03 fiber): 3 points
  - **Low efficiency** (<0.10 protein and <0.015 fiber): 1 point

### 3. **Nutrient Density** (25 points)
**Weight: 25%**

- **Fiber Content** (10 points)
  - For meals (300+ calories): 5g+ fiber = 10 points, 3-4.9g = 7 points, 1-2.9g = 4 points, <1g = 0 points
  - For snacks/shakes (<300 calories): Pro-rated by calorie ratio (e.g., 120 cal meal needs 2g fiber for full points)
  - <1g fiber: 0 points
  
- **Protein Efficiency** (10 points)
  - Protein per calorie ratio >0.20: 10 points (excellent - e.g., 120 cal, 24g protein)
  - 0.15-0.20: 8 points (very good)
  - 0.10-0.15: 6 points (good)
  - 0.05-0.10: 3 points (moderate)
  - <0.05: 0 points (low)
  
- **Overall Nutrient Richness** (5 points)
  - Based on ingredient analysis (whole foods, vegetables, fruits, lean proteins): 5 points
  - Moderate nutrient content: 3 points
  - Low nutrient content: 1 point

### 4. **Ingredient Quality** (20 points)
**Weight: 20%**

- **Whole Foods Presence** (10 points)
  - Primarily whole, unprocessed ingredients: 10 points
  - Mix of whole and processed: 6 points
  - Mostly processed: 2 points
  
- **Processed Ingredients Penalty** (10 points)
  - No highly processed ingredients detected: 10 points
  - 1-2 processed ingredients: 6 points
  - 3+ processed ingredients: 2 points
  - Contains: refined sugars, processed meats, artificial additives, hydrogenated oils: -2 points each

### 5. **Sugar & Sodium** (10 points)
**Weight: 10%**

- **Sugar Content** (5 points)
  - <10g added sugar per meal: 5 points
  - 10-20g: 3 points
  - 21-30g: 1 point
  - >30g: 0 points
  - Inference from ingredients if sugar data not available
  
- **Sodium Content** (5 points)
  - <600mg per meal: 5 points
  - 600-1000mg: 3 points
  - 1001-1500mg: 1 point
  - >1500mg: 0 points
  - Inference from ingredients if sodium data not available

## Grade Assignment

| Score Range | Grade | Description |
|-------------|-------|-------------|
| 90-100 | **A** | Excellent health profile - Highly nutritious, balanced, whole foods |
| 80-89 | **B** | Good health profile - Nutritious with minor improvements possible |
| 70-79 | **C** | Moderate health profile - Decent nutrition but some concerns |
| 60-69 | **D** | Below average health - Several nutritional concerns |
| 0-59 | **F** | Poor health profile - High in processed ingredients, low nutrition |

## Additional Considerations

### Contextual Adjustments
- **Meal Type**: Health grade is objective and does NOT vary by meal type (breakfast, lunch, dinner, snack)
- **Dietary Preferences (Keto, Vegan, etc.)**: These affect personal recommendation scores, NOT the objective health grade
- **Cuisine**: Some cuisines naturally have healthier ingredients (e.g., Mediterranean), but this is captured through ingredient quality analysis

### Ingredient Analysis Keywords
- **Whole Foods**: whole grain, fresh, raw, organic, natural
- **Processed Foods**: refined, processed, canned, frozen (context-dependent), pre-made, packaged
- **Unhealthy Indicators**: sugar, syrup, hydrogenated, trans fat, artificial, preservatives, high fructose
- **Healthy Indicators**: vegetables, fruits, legumes, nuts, seeds, lean proteins, whole grains

## Implementation Notes

1. **Fallback Data**: If `sugar` or `sodium` fields are null, infer from ingredient analysis
2. **Ingredient Parsing**: Analyze ingredient names for processed/whole food indicators
3. **Caching**: Calculate health grade once and store in database (can be recalculated on recipe update)
4. **Display**: Show grade badge (A-F) with color coding on recipe cards
5. **Calorie Context**: For recipes <300 calories, use pro-rated scoring for fiber/protein requirements
6. **Protein Efficiency Bonus**: High protein-to-calorie ratios (>0.20) are excellent, especially for protein shakes/supplements
7. **Meal Type Independence**: Health grade is objective and does NOT vary by meal type (breakfast, lunch, dinner, snack)
8. **Dietary Preferences**: Keto, vegan, etc. affect personal recommendation scores only, NOT the objective health grade

## Example Scoring

**Example 1: Mediterranean Quinoa Bowl**
- Protein: 25g (10/10) ✅
- Fiber: 8g (10/10) ✅
- Calories: 450 (15/15) ✅
- Whole ingredients: Yes (10/10) ✅
- Low sugar: 5g (5/5) ✅
- **Total: 95/100 = A**

**Example 2: Protein Shake (120 calories, 24g protein)**
- Protein: 24g, Protein/Cal ratio: 0.20 (10/10) ✅
- Fiber: 1g (pro-rated for 120 cal: 2/10) ⚠️
- Calories: 120 (10/15) ✅ (appropriate for snack/shake)
- Ingredient quality: Protein powder (6/10) ⚠️
- Low sugar: 2g (5/5) ✅
- **Total: 73/100 = C** (Good protein efficiency, but limited other nutrients)

**Example 3: Fried Chicken with Fries**
- Protein: 30g (10/10) ✅
- Fiber: 2g (4/10) ⚠️
- Calories: 850 (8/15) ⚠️
- Processed ingredients: Yes (2/10) ❌
- High sodium: 1200mg (1/5) ❌
- **Total: 55/100 = F**

**Example 4: Light Snack (150 calories, 5g protein, 3g fiber)**
- Protein: 5g, Protein/Cal ratio: 0.033 (0/10) ❌
- Fiber: 3g (pro-rated for 150 cal: 6/10) ⚠️
- Calories: 150 (12/15) ✅ (appropriate for snack)
- Ingredient quality: Mixed (6/10) ⚠️
- Low sugar: 8g (5/5) ✅
- **Total: 59/100 = F** (Low protein efficiency, but acceptable for a light snack)

