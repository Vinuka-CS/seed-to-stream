# Seed-to-Stream: AI-Powered Content Recommendations

An intelligent movie and TV show recommendation system that combines TMDB data with Google Custom Search for comprehensive, diverse recommendations.

## 🚀 Features

### **Enhanced Recommendation Algorithm**
- **Semantic Embeddings**: OpenAI-powered semantic understanding of content descriptions
- **TMDB Keywords**: Thematic matching using TMDB's curated keyword system
- **Genre Matching**: Enhanced genre enforcement with rarity weighting - sci-fi shows only recommend sci-fi content
- **Multi-Source Discovery**: Combines TMDB API, Google Custom Search, and OMDb API
- **Weighted Scoring**: 8-factor scoring system focused on genre and keywords for better thematic matching
- **Tone Detection**: Prevents tonal mismatches (serious vs. light content)
- **User Feedback Loop**: Learns from your ratings to improve future recommendations
- **Advanced Filtering**: Pre-filters candidates by rating, vote count, and age before scoring

### **Data Sources**
- **TMDB API**: Primary movie/TV database with comprehensive metadata
- **Google Custom Search**: Web-sourced recommendations from IMDb and Rotten Tomatoes
- **OMDb API**: Additional metadata enrichment for web-sourced content

## 🛠️ Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd seed-to-stream
npm install
```

### 2. API Configuration

#### TMDB API (Required)
1. Get your API key from [TMDB](https://www.themoviedb.org/settings/api)
2. Update `src/config/api.ts`:
```typescript
TMDB_API_KEY: 'your_tmdb_api_key_here',
```

#### OpenAI API (Required for Semantic Embeddings)
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `src/config/api.ts`:
```typescript
OPENAI_API_KEY: 'your_openai_api_key_here',
```

#### Google Custom Search API (Optional but Recommended)
1. Create a [Google Custom Search Engine](https://cse.google.com/cse/)
2. Add these sites to your CSE:
   - `site:imdb.com`
   - `site:rottentomatoes.com`
3. Get your CSE ID and API key
4. Update `src/config/api.ts`:
```typescript
GOOGLE_CSE_ID: 'your_cse_id_here',
GOOGLE_API_KEY: 'your_google_api_key_here',
```

#### OMDb API (Optional but Recommended)
1. Get your API key from [OMDb](http://www.omdbapi.com/apikey.aspx)
2. Update `src/config/api.ts`:
```typescript
OMDB_API_KEY: 'your_omdb_api_key_here',
```

### 3. Run the Application
```bash
npm run dev
```

## 🔍 How It Works

### **Recommendation Discovery Strategies**
1. **TMDB Similar Content**: Filtered by strict genre matching
2. **Genre-Based Discovery**: Search by specific genre combinations
3. **Text Keyword Search**: Extract meaningful terms from title/overview
4. **TMDB Keywords**: Thematic matching using TMDB's curated keyword system
5. **Cast/Crew Connections**: Find works by shared actors/directors
6. **Google Custom Search**: Web-sourced recommendations from curated sites
7. **Fallback System**: Ensures recommendations even with strict filtering

### **Scoring Algorithm (0-120 points)**
- **Genre Overlap**: 0-150 points (enhanced with rarity weighting, diversity bonuses, and perfect match bonus)
- **Rating & Reliability**: 0-20 points (reduced weight, normalized 0-1 with vote count bonus)
- **Content Similarity**: 0-25 points (increased weight, semantic embeddings with fallback to keyword analysis)
- **Cast & Crew**: 0-30 points (reduced weight, weighted by role importance)
- **Popularity**: 0-10 points (reduced weight, normalized based on vote count)
- **Tone Matching**: 0-25 points (increased weight, serious/light/action/mystery compatibility)
- **User Feedback**: 0-15 points (reduced weight, personalized boost based on rating history)
- **TMDB Keywords**: 0-45 points (increased weight, thematic similarity using curated keywords)

### **Google Integration Benefits**
- **Diversity**: Web-sourced content from curated sites
- **Freshness**: Access to newer or less-known content
- **Context**: Rich snippets and descriptions
- **Genre Mapping**: Automatic OMDb to TMDB genre conversion

## 🎯 Example Use Cases

### **Sci-Fi Search**
- **Input**: "Blade Runner"
- **Results**: The Matrix, Ex Machina, Arrival, Interstellar
- **Excluded**: Inspector Rex, Friends, The Wire

### **Crime Drama Search**
- **Input**: "The Wire"
- **Results**: The Sopranos, Breaking Bad, Oz, True Detective
- **Excluded**: Inspector Rex, Friends, Modern Family

## 🎨 UI Features

- **Score Breakdown Tooltips**: Detailed scoring information
- **Source Indicators**: TMDB vs. Google-sourced content
- **Enhanced Justifications**: Comprehensive reasoning for each recommendation
- **Genre Enforcement**: Visual confirmation of genre matching
- **Fallback Warnings**: Clear indication of limited genre matches

## 🔧 Technical Implementation

### **Architecture**
- **React + TypeScript**: Modern frontend with type safety
- **Vite**: Fast development and building
- **Tailwind CSS + Shadcn/ui**: Beautiful, responsive UI components
- **Multi-API Integration**: TMDB, Google Custom Search, OMDb

### **Performance Optimizations**
- **Debounced Search**: Optimized API calls during user input
- **Parallel Fetching**: Concurrent API requests for faster results
- **Result Caching**: Local storage for user preferences
- **Smart Deduplication**: Remove duplicate recommendations across sources

### **Error Handling**
- **Graceful Degradation**: Fallback recommendations if APIs fail
- **User Feedback**: Clear error messages and loading states
- **API Rate Limiting**: Respectful API usage with fallbacks

## 🚀 Getting Started

1. **Search**: Enter a movie or TV show title
2. **Select**: Choose your seed item from search results
3. **Discover**: Get intelligent, genre-matched recommendations
4. **Explore**: View detailed score breakdowns and justifications
5. **Save**: Add items to your personal catalogue
6. **Rate**: Provide your own ratings and feedback

## 🔮 Future Enhancements

- **Machine Learning**: User preference learning and adaptive scoring
- **Social Features**: Share recommendations and discover friends' tastes
- **Advanced Filtering**: Year, rating, and content type filters
- **Export/Import**: Catalogue backup and sharing
- **Mobile App**: Native iOS and Android applications

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **TMDB**: Comprehensive movie and TV database
- **Google Custom Search**: Web content discovery
- **OMDb**: Additional metadata enrichment
- **Shadcn/ui**: Beautiful UI components
- **Tailwind CSS**: Utility-first CSS framework
