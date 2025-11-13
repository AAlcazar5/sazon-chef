# Custom Icons for Profile Screen - Analysis

## Current Icon Usage

### 🔄 Still Using Direct Ionicons (Opportunities for Custom Icons)

#### 1. **Loading State** (Large Display Icon)
- **Line 204**: `person-circle-outline` - Loading profile
  - **Custom Icon Opportunity**: Use `Icons.PROFILE_OUTLINE` or `Icons.ACCOUNT_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component

#### 2. **Appearance Section**
- **Line 230**: `color-palette-outline` - Appearance section header
  - **Custom Icon Opportunity**: Use `Icons.THEME_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 239**: `moon` / `sunny` - Dark mode toggle icon
  - **Custom Icon Opportunity**: Use `Icons.DARK_MODE` / `Icons.LIGHT_MODE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 278**: `sunny` - Light mode button
  - **Custom Icon Opportunity**: Use `Icons.LIGHT_MODE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 299**: `moon` - Dark mode button
  - **Custom Icon Opportunity**: Use `Icons.DARK_MODE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 320**: `phone-portrait-outline` - System mode button
  - **Custom Icon Opportunity**: Use `Icons.SYSTEM_MODE_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component

#### 3. **Edit Actions**
- **Line 340, 365, 411, 464**: `create-outline` - Edit buttons (4 instances)
  - **Custom Icon Opportunity**: Use `Icons.EDIT_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component

#### 4. **Section Icons**
- **Line 349**: `body` - Physical profile
  - **Custom Icon Opportunity**: Use `Icons.PHYSICAL_PROFILE_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 394**: `target` - Macro goals
  - **Custom Icon Opportunity**: Use `Icons.MACRO_GOALS_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component

#### 5. **Account Actions**
- **Line 552**: `download-outline` - Export data
  - **Custom Icon Opportunity**: Use `Icons.EXPORT_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 555, 566, 584, 596**: `chevron-forward` - Navigation indicators (4 instances)
  - **Custom Icon Opportunity**: Use `Icons.CHEVRON_FORWARD` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 563**: `trash-outline` - Clear history
  - **Custom Icon Opportunity**: Use `Icons.DELETE_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 581**: `lock-closed-outline` - Change password
  - **Custom Icon Opportunity**: Use `Icons.LOCK_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component
  
- **Line 593**: `log-out-outline` - Sign out
  - **Custom Icon Opportunity**: Use `Icons.LOG_OUT_OUTLINE` (centralized)
  - **Status**: Centralize through Icon component

## Recommended Custom Icons Priority

### High Priority (App-Specific or Frequently Used)
1. **Theme Icons** - Core feature, should be distinctive
   - Dark mode, light mode, system mode icons
   - Appearance section header

2. **Loading State** - Large display icon

### Medium Priority (Standard but Should Centralize)
3. **Edit Actions** - Frequently used feature
4. **Account Actions** - Important features
5. **Section Icons** - Visual indicators

### Low Priority (Standard UI Patterns)
6. **Navigation** - Standard chevrons

## Implementation Notes

1. **Reuse Existing Constants**: Many icons can reuse constants from other screens
2. **Theme Icons**: Need to add theme-specific icons if not already present
3. **Consistency**: Use same icons as other screens for similar actions
4. **Accessibility**: All icons should have descriptive `accessibilityLabel` props

## Implementation Status

### ✅ Completed
All icons on the profile screen have been centralized:

1. **Added to `Icon.tsx`**:
   - `person-circle` and `person-circle-outline` for account/profile
   - `color-palette` and `color-palette-outline` for theme/appearance
   - `sunny` and `sunny-outline` for light mode
   - `moon` and `moon-outline` for dark mode
   - `phone-portrait` and `phone-portrait-outline` for system mode
   - `body` and `body-outline` for physical profile
   - `target` and `target-outline` for macro goals
   - `download` and `download-outline` for export
   - `log-out` and `log-out-outline` for sign out

2. **Added to `Icons.ts`**:
   - `ACCOUNT` and `ACCOUNT_OUTLINE`: 'person-circle' / 'person-circle-outline'
   - `THEME` and `THEME_OUTLINE`: 'color-palette' / 'color-palette-outline'
   - `LIGHT_MODE` and `LIGHT_MODE_OUTLINE`: 'sunny' / 'sunny-outline'
   - `DARK_MODE` and `DARK_MODE_OUTLINE`: 'moon' / 'moon-outline'
   - `SYSTEM_MODE` and `SYSTEM_MODE_OUTLINE`: 'phone-portrait' / 'phone-portrait-outline'
   - `PHYSICAL_PROFILE` and `PHYSICAL_PROFILE_OUTLINE`: 'body' / 'body-outline'
   - `MACRO_GOALS` and `MACRO_GOALS_OUTLINE`: 'target' / 'target-outline'
   - `EXPORT` and `EXPORT_OUTLINE`: 'download' / 'download-outline'
   - `LOG_OUT` and `LOG_OUT_OUTLINE`: 'log-out' / 'log-out-outline'

3. **Updated `profile.tsx`**:
   - Replaced all direct `Ionicons` usage with `Icon` component
   - Used existing constants where applicable
   - Added accessibility labels for all icons
   - Applied consistent icon sizing using `IconSizes`
   - Fixed dark mode text colors

## 🎉 Profile Screen Complete!

All icons on the profile screen are now centralized through the `Icon` component:
- ✅ **Loading State**: 1 icon (account/profile)
- ✅ **Appearance Section**: 5 icons (theme, light, dark, system mode)
- ✅ **Edit Actions**: 4 icons (edit buttons)
- ✅ **Section Icons**: 2 icons (physical profile, macro goals)
- ✅ **Account Actions**: 5 icons (export, delete, lock, log out, chevrons)

**Total Icons Migrated**: 17+ icons
**Direct Ionicons Remaining**: 0 (all centralized!)

