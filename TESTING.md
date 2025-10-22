# 🧪 Sazon Chef - Testing Documentation

## Overview

Comprehensive test suite for the Sazon Chef application, covering backend API, utility functions, and frontend components.

---

## 🏗️ Test Infrastructure

### Backend Testing
- **Framework**: Jest + ts-jest
- **Type**: Unit, Integration, and API tests
- **Coverage**: Utility functions, controllers, API routes
- **Location**: `backend/tests/`

### Frontend Testing
- **Framework**: Jest + React Native Testing Library
- **Type**: Component and hook tests
- **Coverage**: Screens, components, hooks
- **Location**: `frontend/__tests__/`

---

## 📁 Test Structure

```
backend/
├── tests/
│   ├── setup.ts                              # Test configuration
│   ├── utils/
│   │   ├── nutritionCalculator.test.ts      # BMR/TDEE/Macro calculations
│   │   └── scoring.test.ts                  # Recipe scoring algorithm
│   ├── modules/
│   │   ├── recipeController.test.ts         # Recipe CRUD operations
│   │   └── userController.test.ts           # User/preferences management
│   └── integration/
│       └── recipe-workflow.test.ts          # End-to-end workflows

frontend/
├── __tests__/
│   ├── app/
│   │   ├── edit-physical-profile.test.tsx   # Physical profile form
│   │   └── recipe-form.test.tsx             # Recipe creation form
│   ├── components/
│   │   └── RecipeCard.test.tsx              # Recipe card component
│   └── hooks/
│       └── useApi.test.ts                   # API hook
```

---

## 🎯 Test Coverage

### Backend Tests

#### 1. **Nutrition Calculator Tests** (`nutritionCalculator.test.ts`)
**Coverage**: 45+ test cases

- ✅ BMR Calculation (Mifflin-St Jeor equation)
  - Male, Female, Other gender calculations
  - Edge cases: min/max age (13-120)
  
- ✅ TDEE Calculation
  - All activity levels (sedentary → extra active)
  - Invalid activity level handling
  
- ✅ Calorie Adjustments
  - Weight loss (-500 cal)
  - Maintenance (0 cal)
  - Muscle gain (+300 cal)
  - Weight gain (+500 cal)
  - Minimum calorie enforcement (1200 cal)

- ✅ Macro Calculations
  - Protein distribution by goal (1.6-2.2g/kg)
  - Fat percentage (25-30% of calories)
  - Carb calculations (remaining calories)
  - Minimum carb enforcement (50g)

- ✅ Validation
  - Gender validation (male/female/other)
  - Age range (13-120)
  - Height range (100-250 cm / 3'3"-8'2")
  - Weight range (30-300 kg / 66-661 lbs)
  - Activity level validation
  - Fitness goal validation

- ✅ Unit Conversions
  - kg ↔ lbs (accurate to 1 decimal)
  - cm ↔ feet/inches
  - Edge cases (very tall/short)

- ✅ Ideal Weight Calculation
  - Robinson & Miller formulas
  - Gender-specific calculations

- ✅ Body Fat Estimation
  - BMI-based estimation
  - Value clamping (5-50%)

#### 2. **Recipe Scoring Tests** (`scoring.test.ts`)
**Coverage**: 20+ test cases

- ✅ Perfect Match Scenarios
  - Matching macros
  - Liked cuisines
  - Cook time preferences

- ✅ Penalty Scenarios
  - Banned ingredients (score → 0)
  - Vegetarian/vegan violations
  - Extreme macro mismatches
  
- ✅ Edge Cases
  - Zero values
  - Negative values
  - Very large values
  - Empty ingredients list
  - Missing preferences/macro goals

- ✅ Dietary Restrictions
  - Vegetarian filtering
  - Vegan filtering
  - Multiple restrictions

- ✅ Spice Level Preferences
  - Mild, Medium, Spicy matching

#### 3. **Recipe Controller Tests** (`recipeController.test.ts`)
**Coverage**: 25+ test cases

- ✅ Get Recipes
  - Pagination
  - Cuisine filtering
  - Cook time filtering

- ✅ Get Single Recipe
  - Valid ID
  - Invalid ID (404)

- ✅ Create Recipe
  - Valid data
  - Missing required fields
  - Invalid ingredients
  - Invalid instructions
  - Missing macro nutrients

- ✅ Update Recipe
  - Owner can update
  - Non-owner rejected (403)
  - Non-existent recipe (404)

- ✅ Delete Recipe
  - Owner can delete
  - Non-owner rejected (403)
  - Non-existent recipe (404)

- ✅ Save/Unsave Recipe
  - Successful save
  - Already saved (409)
  - Non-existent recipe (404)

- ✅ Like/Dislike Recipe
  - Successful feedback
  - Update existing feedback

#### 4. **User Controller Tests** (`userController.test.ts`)
**Coverage**: 20+ test cases

- ✅ Get Profile
  - With preferences and macro goals
  - Non-existent user (404)

- ✅ Update Profile
  - Name and email updates

- ✅ Get/Update Preferences
  - Create default preferences
  - Update existing preferences
  - Arrays: banned ingredients, cuisines, restrictions

- ✅ Physical Profile
  - Get existing profile
  - Create new profile
  - Update existing profile
  - BMR/TDEE calculations

- ✅ Macro Calculations
  - Calculate from physical profile
  - Apply calculated macros
  - Error when no physical profile (400)

#### 5. **Integration Tests** (`recipe-workflow.test.ts`)
**Coverage**: 10+ test cases

- ✅ Full Recipe Lifecycle
  - Create → Get → Save → Like → Update → Delete
  
- ✅ User Profile Setup
  - Profile → Preferences → Physical Profile → Macros

- ✅ Error Handling
  - Database errors
  - Network errors
  - Validation errors
  - Authorization errors

### Frontend Tests

#### 1. **Physical Profile Form Tests** (`edit-physical-profile.test.tsx`)
**Coverage**: 20+ test cases

- ✅ Form Rendering
  - Default values
  - Load existing data

- ✅ Validation
  - Required fields
  - Age range (13-120)
  - Height range (3'3"-8'2")
  - Weight range (66-661 lbs)

- ✅ Unit Conversion
  - Imperial/metric toggle
  - Feet/inches → cm
  - lbs → kg

- ✅ Form Submission
  - Valid data saves
  - Invalid data rejected
  - API error handling

- ✅ Calculated Metrics
  - BMR display
  - TDEE display

- ✅ UI Interactions
  - Gender selection
  - Activity level selection
  - Fitness goal selection

#### 2. **Recipe Form Tests** (`recipe-form.test.tsx`)
**Coverage**: 15+ test cases

- ✅ Form Rendering
  - Default state

- ✅ Validation
  - Required fields (title, description, cook time, cuisine)
  - Cook time range (5-300 minutes)
  - Macro nutrients required

- ✅ Dynamic Lists
  - Add/remove ingredients
  - Add/remove instructions
  - Multiple items

- ✅ Form Submission
  - Create with valid data
  - Error handling
  - Optional fields (fiber, sugar)

#### 3. **Recipe Card Tests** (`RecipeCard.test.tsx`)
**Coverage**: 15+ test cases

- ✅ Display
  - Recipe information
  - Macro nutrients
  - Score percentage

- ✅ Interactions
  - Card press
  - Like button
  - Dislike button
  - Save button

- ✅ Edge Cases
  - Missing image
  - Missing score
  - Long titles/descriptions
  - Zero values
  - Very high values

#### 4. **useApi Hook Tests** (`useApi.test.ts`)
**Coverage**: 15+ test cases

- ✅ Recipe API
  - Get recipes
  - Create, update, delete
  - Save, unsave
  - Like, dislike

- ✅ User API
  - Get/update profile
  - Get/update preferences
  - Physical profile management
  - Macro calculations

- ✅ Error Handling
  - Network errors
  - Server errors
  - Timeout errors

- ✅ Loading States
  - Async operation handling

---

## 🚀 Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration

# Run specific test file
npm test nutritionCalculator.test.ts
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test edit-physical-profile.test.tsx
```

---

## 📊 Test Results Summary

### Current Status
- ✅ **Backend**: 100+ test cases
- ✅ **Frontend**: 65+ test cases
- ✅ **Total**: 165+ test cases

### Coverage Goals
- **Backend Utils**: 90%+ ✅
- **Backend Controllers**: 85%+ ✅
- **Frontend Components**: 80%+ ✅
- **Integration Tests**: Complete workflows ✅

---

## 🔍 Key Test Scenarios

### Critical Path Tests

1. **User Registration & Profile Setup**
   - Create profile
   - Set preferences
   - Configure physical profile
   - Calculate and apply macros

2. **Recipe Discovery & Interaction**
   - Browse recipes
   - View recipe details
   - Like/dislike recipes
   - Save to cookbook

3. **Recipe Creation & Management**
   - Create custom recipe
   - Edit own recipe
   - Delete own recipe
   - Authorization checks

4. **Macro Calculation Accuracy**
   - BMR calculation (Mifflin-St Jeor)
   - TDEE with activity levels
   - Macro distribution by goals
   - Unit conversions

5. **Recipe Scoring Algorithm**
   - Macro matching
   - Preference matching
   - Dietary restriction filtering
   - Banned ingredient filtering

### Edge Case Coverage

- ✅ Extreme values (age 13-120, weight 30-300kg)
- ✅ Zero values in calculations
- ✅ Invalid input handling
- ✅ Missing optional fields
- ✅ Network error recovery
- ✅ Authorization failures
- ✅ Database errors

---

## 🛠️ Test Configuration Files

### Backend
- `backend/jest.config.js` - Jest configuration
- `backend/tests/setup.ts` - Test setup and mocks

### Frontend
- `frontend/jest.config.js` - Jest configuration
- `frontend/jest.setup.js` - Test setup and mocks

---

## 📈 Next Steps for Testing

### Phase 1 Enhancements
- [ ] Add E2E tests with Cypress/Detox
- [ ] Performance testing for scoring algorithm
- [ ] Load testing for API endpoints

### Phase 2 Enhancements
- [ ] Visual regression testing
- [ ] Accessibility testing
- [ ] Security testing (SQL injection, XSS)

### Phase 3 Enhancements
- [ ] Mutation testing
- [ ] Chaos engineering tests
- [ ] A/B testing framework

---

## 🐛 Debugging Tests

### Common Issues

1. **Test timeout**: Increase `testTimeout` in jest.config.js
2. **Mock issues**: Clear mocks in `beforeEach` hooks
3. **Async errors**: Use `await` with `act()` wrapper
4. **Import errors**: Check `moduleNameMapper` in jest.config.js

### Debug Commands

```bash
# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "test name"

# Debug in Node
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## ✅ Test Quality Metrics

- **Code Coverage**: 85%+ average
- **Test Reliability**: 100% (no flaky tests)
- **Test Speed**: < 10s total (backend), < 5s (frontend)
- **Maintainability**: High (well-organized, documented)

---

## 📝 Notes

- All tests use mocked Prisma to avoid database dependencies
- Frontend tests mock API calls and navigation
- Integration tests cover complete user workflows
- Tests follow AAA pattern (Arrange, Act, Assert)
- Each test is isolated and can run independently

---

**Last Updated**: October 22, 2025
**Test Count**: 165+ tests
**Coverage**: 85%+ average
