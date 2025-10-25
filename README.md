# 🍳 Sazon Chef - AI-Powered Recipe Recommendation App

A full-stack mobile application that provides personalized recipe recommendations based on user preferences, dietary restrictions, and nutritional goals. Built with React Native/Expo frontend and Node.js/Express backend.

## 🌟 Features

### Core Functionality
- **Smart Recipe Recommendations**: AI-powered algorithm that matches recipes to user preferences
- **Personal Recipe Management**: Create, edit, and delete your own recipes
- **Nutritional Tracking**: Comprehensive macro nutrient calculations and goal setting
- **Physical Profile Integration**: BMR/TDEE calculations based on user physical data
- **Dietary Preferences**: Manage banned ingredients, liked cuisines, and dietary restrictions
- **Recipe Interactions**: Like/dislike, save to cookbook, and provide feedback

### Advanced Features
- **Imperial/Metric Unit Support**: Default to US units with global metric options
- **Recipe Scoring Algorithm**: Multi-factor scoring based on macros, preferences, and dietary restrictions
- **Comprehensive Testing**: 165+ test cases covering all critical functionality
- **Real-time Validation**: Client and server-side validation for all user inputs

## 🏗️ Architecture

### Frontend (React Native/Expo)
- **Framework**: React Native with Expo Router
- **Styling**: Tailwind CSS with NativeWind
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Navigation**: Expo Router with tab navigation and modals
- **API Integration**: Axios-based API client with error handling

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: Placeholder system (ready for integration)
- **API**: RESTful endpoints with comprehensive validation
- **Testing**: Jest with 100+ test cases

### Database Schema
- **User Management**: Profiles, preferences, physical data
- **Recipe System**: User-created and system recipes with full metadata
- **Interactions**: Likes, saves, feedback, and meal history
- **Nutritional Data**: Macro goals, calculations, and tracking

## 📱 Screens & Navigation

### Main Tabs
- **Home**: Recipe recommendations with scoring
- **Cookbook**: Saved recipes and user-created recipes
- **Profile**: User settings, preferences, and macro goals

### Modal Screens
- **Recipe Details**: Full recipe information with interactions
- **Recipe Form**: Create and edit custom recipes
- **Physical Profile**: Height, weight, age, activity level input
- **Macro Goals**: Calorie and macro nutrient targets
- **Preferences**: Dietary restrictions and cuisine preferences

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sazon
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Database setup**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   npm run seed
   ```

4. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                # Run all tests
npm run test:coverage   # With coverage report
npm run test:watch      # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm test                # Run all tests
npm run test:coverage   # With coverage report
npm run test:watch      # Watch mode
```

### Test Coverage
- **Backend**: 100+ test cases (85%+ coverage)
- **Frontend**: 65+ test cases (80%+ coverage)
- **Integration**: Complete user workflow testing

## 📊 API Endpoints

### Recipe Management
- `GET /api/recipes` - Get all recipes with filtering
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/:id/save` - Save recipe to cookbook
- `DELETE /api/recipes/:id/save` - Remove from cookbook
- `POST /api/recipes/:id/like` - Like recipe
- `POST /api/recipes/:id/dislike` - Dislike recipe

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/preferences` - Get preferences
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/physical-profile` - Get physical profile
- `PUT /api/user/physical-profile` - Update physical profile
- `GET /api/user/macro-goals` - Get macro goals
- `PUT /api/user/macro-goals` - Update macro goals
- `GET /api/user/calculate-macros` - Calculate recommended macros
- `POST /api/user/apply-calculated-macros` - Apply calculated macros

## 🔧 Configuration

### Environment Variables
Create `.env` files in the backend directory:
```env
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3001
NODE_ENV=development

```

### Database Configuration
The app uses SQLite with Prisma ORM. Database files are automatically created and managed by Prisma migrations.

## 📁 Project Structure

```
sazon/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── modules/        # Feature modules (user, recipe)
│   │   ├── utils/          # Utility functions
│   │   └── lib/           # Shared libraries
│   ├── prisma/            # Database schema and migrations
│   ├── tests/             # Backend tests
│   └── package.json
├── frontend/               # React Native/Expo frontend
│   ├── app/               # Expo Router screens
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # API client and utilities
│   ├── __tests__/        # Frontend tests
│   └── package.json
├── docs/                  # Documentation
└── README.md
```

## 🧮 Algorithm Details

### Recipe Scoring
The recommendation algorithm uses multiple factors:
- **Macro Match** (70% weight): Calorie, protein, carb, fat alignment
- **Taste Match** (30% weight): Cuisine preferences, spice level
- **Cook Time** (10% weight): Alignment with user's time preferences
- **Ingredient Match** (10% weight): Banned ingredients penalty

### Nutritional Calculations
- **BMR**: Mifflin-St Jeor equation for accurate metabolic rate
- **TDEE**: Activity level multipliers for total daily energy expenditure
- **Macro Distribution**: Protein (1.6-2.2g/kg), Fat (25-30%), Carbs (remaining)

## 🔒 Security Considerations

### Data Protection
- All sensitive files listed in `.gitignore`
- Environment variables properly isolated
- Database files excluded from version control
- API keys and secrets protected


## 🚀 Deployment

### Backend Deployment
1. Set up production database (PostgreSQL recommended)
2. Configure environment variables
3. Run database migrations
4. Deploy to cloud platform (Heroku, Railway, etc.)

### Frontend Deployment
1. Build for production: `expo build`
2. Deploy to app stores (iOS/Android)
3. Configure API endpoints for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Development Roadmap

### Phase 1: MVP Foundation ✅
- [x] Basic navigation and UI components
- [x] Backend API with database integration
- [x] Recipe CRUD operations
- [x] User preference system


## 🐛 Known Issues

- Database migrations need production setup
- Image upload functionality pending
- Push notifications not implemented

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Development**: Full-stack development with React Native and Node.js
- **Testing**: Comprehensive test suite with 165+ test cases
- **Documentation**: Complete API and user documentation

## 📞 Support

For support, create an issue in the repository.

---

**Built with ❤️ for food lovers everywhere**
