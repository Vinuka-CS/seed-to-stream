// API Configuration for Seed-to-Stream
// Replace the placeholder values with your actual API keys

export const API_CONFIG = {
  // TMDB API (Required)
  // Get your API key from: https://www.themoviedb.org/settings/api
  TMDB_API_KEY: 'fb7bb23f03b6994dafc674c074d01761',
  
  // OpenAI API (Required for semantic embeddings)
  // Get your API key from: https://platform.openai.com/api-keys
  OPENAI_API_KEY: 'your_openai_api_key_here',
  
  // Google Custom Search API (Optional but Recommended)
  // Get your CSE ID and API key from: https://cse.google.com/cse/
  // Add these sites to your CSE: site:imdb.com OR site:rottentomatoes.com
  GOOGLE_CSE_ID: 'your_google_cse_id_here',
  GOOGLE_API_KEY: 'your_google_api_key_here',
  
  // OMDb API (Optional but Recommended)
  // Get your API key from: http://www.omdbapi.com/apikey.aspx
  OMDB_API_KEY: 'your_omdb_api_key_here',
};

// API Base URLs
export const API_URLS = {
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  GOOGLE_SEARCH_URL: 'https://www.googleapis.com/customsearch/v1',
  OMDB_BASE_URL: 'http://www.omdbapi.com/',
};

// Feature flags
export const FEATURES = {
  ENABLE_GOOGLE_SEARCH: !!API_CONFIG.GOOGLE_CSE_ID && !!API_CONFIG.GOOGLE_API_KEY,
  ENABLE_OMDB: !!API_CONFIG.OMDB_API_KEY,
  ENABLE_SEMANTIC_EMBEDDINGS: !!API_CONFIG.OPENAI_API_KEY && API_CONFIG.OPENAI_API_KEY !== 'your_openai_api_key_here',
  ENABLE_USER_FEEDBACK: true,
  ENABLE_STRICT_GENRE_MATCHING: true,
  ENABLE_TONE_DETECTION: true,
  ENABLE_ERA_SIMILARITY: true,
  ENABLE_ADVANCED_FILTERING: true,
};

// Rate limiting and performance settings
export const PERFORMANCE_CONFIG = {
  MAX_RECOMMENDATIONS: 50,
  GOOGLE_SEARCH_LIMIT: 8,
  TMDB_SIMILAR_LIMIT: 20,
  GENRE_SEARCH_LIMIT: 15,
  KEYWORD_SEARCH_LIMIT: 10,
  TMDB_KEYWORD_SEARCH_LIMIT: 12,
  CAST_CREW_LIMIT: 5,
  FALLBACK_THRESHOLD: 10,
};
