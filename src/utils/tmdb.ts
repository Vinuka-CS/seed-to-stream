const TMDB_API_KEY = 'fb7bb23f03b6994dafc674c074d01761';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type: 'movie' | 'tv';
}

export interface TMDBSearchResponse {
  results: TMDBItem[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface ScoredRecommendation extends TMDBItem {
  score: number;
  justification: string;
}

// Get image URL with different sizes
export const getImageUrl = (path: string | null, size: 'w300' | 'w500' | 'w780' | 'original' = 'w500') => {
  if (!path) return '/placeholder.svg';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

// Search for movies and TV shows
export const searchMulti = async (query: string): Promise<TMDBItem[]> => {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
    );
    
    if (!response.ok) throw new Error('Search failed');
    
    const data: TMDBSearchResponse = await response.json();
    return data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Get similar movies or TV shows
export const getSimilar = async (id: number, mediaType: 'movie' | 'tv'): Promise<TMDBItem[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${id}/similar?api_key=${TMDB_API_KEY}&page=1`
    );
    
    if (!response.ok) throw new Error('Failed to fetch similar items');
    
    const data: TMDBSearchResponse = await response.json();
    return data.results.map(item => ({ ...item, media_type: mediaType }));
  } catch (error) {
    console.error('Similar items error:', error);
    return [];
  }
};

// Get movie/TV details including genres
export const getDetails = async (id: number, mediaType: 'movie' | 'tv') => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch details');
    
    return await response.json();
  } catch (error) {
    console.error('Details error:', error);
    return null;
  }
};

// Get genre list for movies and TV
export const getGenres = async (mediaType: 'movie' | 'tv'): Promise<TMDBGenre[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/${mediaType}/list?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch genres');
    
    const data = await response.json();
    return data.genres;
  } catch (error) {
    console.error('Genres error:', error);
    return [];
  }
};

// Score and sort recommendations
export const scoreRecommendations = (seedItem: TMDBItem, recommendations: TMDBItem[], genres: TMDBGenre[]): ScoredRecommendation[] => {
  const seedYear = new Date(seedItem.release_date || seedItem.first_air_date || '').getFullYear();
  const seedGenres = seedItem.genre_ids;
  const seedRating = seedItem.vote_average;
  
  return recommendations.map(item => {
    let score = 0;
    const justificationParts: string[] = [];
    
    // 1. Genre overlap (0-40 points)
    const commonGenres = item.genre_ids.filter(genreId => seedGenres.includes(genreId));
    const genreScore = (commonGenres.length / Math.max(seedGenres.length, 1)) * 40;
    score += genreScore;
    
    if (commonGenres.length > 0) {
      const genreNames = commonGenres.map(id => genres.find(g => g.id === id)?.name).filter(Boolean);
      justificationParts.push(`Shares ${genreNames.slice(0, 2).join(' and ')} themes`);
    }
    
    // 2. Release year proximity (0-25 points)
    const itemYear = new Date(item.release_date || item.first_air_date || '').getFullYear();
    const yearDiff = Math.abs(seedYear - itemYear);
    const yearScore = Math.max(0, 25 - yearDiff);
    score += yearScore;
    
    if (yearDiff <= 5) {
      justificationParts.push(`Released around same time (${itemYear})`);
    }
    
    // 3. TMDB rating (0-25 points)
    const ratingScore = (item.vote_average / 10) * 25;
    score += ratingScore;
    
    if (item.vote_average >= 7) {
      justificationParts.push(`High TMDB rating (${item.vote_average.toFixed(1)})`);
    }
    
    // 4. Description similarity (basic keyword matching) (0-10 points)
    const seedWords = seedItem.overview.toLowerCase().split(/\W+/);
    const itemWords = item.overview.toLowerCase().split(/\W+/);
    const commonWords = seedWords.filter(word => itemWords.includes(word) && word.length > 3);
    const descScore = Math.min(10, commonWords.length * 2);
    score += descScore;
    
    if (commonWords.length > 2) {
      justificationParts.push('Similar plot elements');
    }
    
    return {
      ...item,
      score: Math.round(score),
      justification: justificationParts.length > 0 ? justificationParts.join(', ') : 'Similar content style'
    };
  }).sort((a, b) => b.score - a.score);
};

// Helper to get display title
export const getDisplayTitle = (item: TMDBItem): string => {
  return item.title || item.name || 'Unknown Title';
};

// Helper to get release year
export const getReleaseYear = (item: TMDBItem): string => {
  const date = item.release_date || item.first_air_date;
  if (!date) return 'Unknown';
  return new Date(date).getFullYear().toString();
};