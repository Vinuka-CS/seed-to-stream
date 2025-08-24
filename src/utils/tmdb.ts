import { API_CONFIG, API_URLS, FEATURES, PERFORMANCE_CONFIG } from '@/config/api';
import { getSemanticSimilarity, getBatchEmbeddings } from './embeddings';
import { getRecommendationBoost } from './feedback';

const TMDB_API_KEY = API_CONFIG.TMDB_API_KEY;
const TMDB_BASE_URL = API_URLS.TMDB_BASE_URL;
const TMDB_IMAGE_BASE_URL = API_URLS.TMDB_IMAGE_BASE_URL;

// Google Custom Search API configuration
const GOOGLE_CSE_ID = API_CONFIG.GOOGLE_CSE_ID;
const GOOGLE_API_KEY = API_CONFIG.GOOGLE_API_KEY;
const GOOGLE_SEARCH_URL = API_URLS.GOOGLE_SEARCH_URL;

// OMDb API configuration for additional metadata
const OMDB_API_KEY = API_CONFIG.OMDB_API_KEY;
const OMDB_BASE_URL = API_URLS.OMDB_BASE_URL;

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
  tagline?: string;
  isFallback?: boolean; // Flag for fallback items that don't match genres
  isGoogleSourced?: boolean; // Flag for items sourced from Google
  googleSnippet?: string; // Snippet from Google search result
  omdbData?: any; // Raw data from OMDb API
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

export interface TMDBCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  order: number;
}

export interface TMDBCreditsResponse {
  cast: TMDBCredit[];
  crew: TMDBCredit[];
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBKeywordsResponse {
  keywords: TMDBKeyword[];
}

export interface ScoredRecommendation extends TMDBItem {
  score: number;
  justification: string;
  scoreBreakdown: {
    genreScore: number;
    ratingScore: number;
    descriptionScore: number;
    castCrewScore: number;
    popularityScore: number;
    toneScore: number;
    keywordScore: number;
  };
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

// Get movie/TV details including genres and tagline
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

// Get credits (cast and crew) for a movie or TV show
export const getCredits = async (id: number, mediaType: 'movie' | 'tv'): Promise<TMDBCreditsResponse | null> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${id}/credits?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch credits');
    
    return await response.json();
  } catch (error) {
    console.error('Credits error:', error);
    return null;
  }
};

// Get keywords for a movie or TV show
export const getKeywords = async (id: number, mediaType: 'movie' | 'tv'): Promise<TMDBKeyword[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${id}/keywords?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch keywords');
    
    const data: TMDBKeywordsResponse = await response.json();
    return data.keywords || [];
  } catch (error) {
    console.error('Keywords error:', error);
    return [];
  }
};

// Search for content by keywords using TMDB discover endpoint
export const searchByKeywords = async (
  keywordIds: number[], 
  mediaType: 'movie' | 'tv',
  options: {
    minRating?: number;
    minVoteCount?: number;
    maxAge?: number;
    limit?: number;
  } = {}
): Promise<TMDBItem[]> => {
  try {
    const {
      minRating = 6.0,
      minVoteCount = 100,
      maxAge = 50,
      limit = 20
    } = options;

    const currentYear = new Date().getFullYear();
    
    // Build keyword query - TMDB allows multiple keywords with AND logic
    const keywordQuery = keywordIds.join('|');
    
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_keywords=${keywordQuery}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&page=1`
    );
    
    if (!response.ok) throw new Error('Keyword search failed');
    
    const data: TMDBSearchResponse = await response.json();
    
    // Apply additional filtering
    return data.results
      .filter(item => item.vote_average >= minRating)
      .filter(item => {
        const releaseYear = parseInt(getReleaseYear(item));
        return !isNaN(releaseYear) && (currentYear - releaseYear) <= maxAge;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Keyword search error:', error);
    return [];
  }
};

// Google Custom Search for web-sourced recommendations
export const searchGoogleForSimilarContent = async (seedTitle: string): Promise<any[]> => {
  if (!GOOGLE_CSE_ID || !GOOGLE_API_KEY) {
    console.warn('Google Custom Search API not configured');
    return [];
  }

  try {
    const query = `movies similar to "${seedTitle}" site:imdb.com OR site:rottentomatoes.com`;
    const response = await fetch(
      `${GOOGLE_SEARCH_URL}?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=10`
    );

    if (!response.ok) throw new Error('Google search failed');

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Google search error:', error);
    return [];
  }
};

// Extract title from Google search result
const extractTitleFromGoogleResult = (result: any): string => {
  const title = result.title || '';
  
  // Clean up IMDb titles (remove " - IMDb" suffix)
  if (title.includes(' - IMDb')) {
    return title.replace(' - IMDb', '');
  }
  
  // Clean up Rotten Tomatoes titles (remove " - Rotten Tomatoes" suffix)
  if (title.includes(' - Rotten Tomatoes')) {
    return title.replace(' - Rotten Tomatoes', '');
  }
  
  // Remove common suffixes
  const suffixes = [' - Movie', ' - Film', ' - TV Show', ' - Series'];
  for (const suffix of suffixes) {
    if (title.includes(suffix)) {
      return title.replace(suffix, '');
    }
  }
  
  return title;
};

// Fetch metadata from OMDb API
const fetchOMDbMetadata = async (title: string, year?: string): Promise<any> => {
  if (!OMDB_API_KEY) {
    console.warn('OMDb API not configured');
    return null;
  }

  try {
    const searchQuery = year ? `${title} ${year}` : title;
    const response = await fetch(
      `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(searchQuery)}`
    );

    if (!response.ok) throw new Error('OMDb API request failed');

    const data = await response.json();
    return data.Response === 'True' ? data : null;
  } catch (error) {
    console.error('OMDb API error:', error);
    return null;
  }
};

// Convert Google search results to TMDBItem format
const convertGoogleResultToTMDBItem = async (result: any, seedItem: TMDBItem, allGenres: TMDBGenre[]): Promise<TMDBItem | null> => {
  try {
    const extractedTitle = extractTitleFromGoogleResult(result);
    if (!extractedTitle) return null;

    // Try to find the item in TMDB first
    const tmdbSearch = await searchMulti(extractedTitle);
    const tmdbMatch = tmdbSearch.find(item => 
      item.title?.toLowerCase().includes(extractedTitle.toLowerCase()) ||
      item.name?.toLowerCase().includes(extractedTitle.toLowerCase())
    );

    if (tmdbMatch) {
      // If found in TMDB, return the TMDB item with Google source flag
      return {
        ...tmdbMatch,
        isGoogleSourced: true,
        googleSnippet: result.snippet
      };
    }

    // If not found in TMDB, try OMDb API
    const omdbData = await fetchOMDbMetadata(extractedTitle);
    if (omdbData) {
      // Map OMDb genres to TMDB genre IDs
      const mappedGenres = mapOMDbGenresToTMDB(omdbData.Genre, allGenres);
      
      // Convert OMDb data to TMDBItem format
      const convertedItem: TMDBItem = {
        id: Date.now() + Math.random(), // Generate unique ID
        title: omdbData.Title,
        overview: omdbData.Plot || 'No overview available',
        poster_path: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
        backdrop_path: null,
        release_date: omdbData.Year ? `${omdbData.Year}-01-01` : undefined,
        first_air_date: omdbData.Year ? `${omdbData.Year}-01-01` : undefined,
        vote_average: parseFloat(omdbData.imdbRating) || 0,
        vote_count: parseInt(omdbData.imdbVotes?.replace(/,/g, '')) || 0,
        genre_ids: mappedGenres,
        media_type: omdbData.Type === 'series' ? 'tv' : 'movie',
        isGoogleSourced: true,
        googleSnippet: result.snippet,
        omdbData: omdbData
      };
      return convertedItem;
    }

    // Fallback: create basic item from Google result
    return {
      id: Date.now() + Math.random(),
      title: extractedTitle,
      overview: result.snippet || 'No overview available',
      poster_path: null,
      backdrop_path: null,
      release_date: undefined,
      first_air_date: undefined,
      vote_average: 0,
      vote_count: 0,
      genre_ids: [],
      media_type: seedItem.media_type,
      isGoogleSourced: true,
      googleSnippet: result.snippet
    };
  } catch (error) {
    console.error('Error converting Google result:', error);
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

// Enhanced recommendation discovery using multiple strategies with improved filtering
export const getIntelligentRecommendations = async (seedItem: TMDBItem): Promise<TMDBItem[]> => {
  const recommendations: TMDBItem[] = [];
  const seenIds = new Set([seedItem.id]);
  
  // Fetch genres early for mapping purposes
  let allGenres: TMDBGenre[] = [];
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      getGenres('movie'),
      getGenres('tv')
    ]);
    allGenres = [...movieGenres, ...tvGenres];
  } catch (error) {
    console.warn('Failed to fetch genres for mapping:', error);
  }
  
  try {
    // Strategy 1: Get similar content from TMDB (but filter aggressively)
    const similarResponse = await fetch(
      `${TMDB_BASE_URL}/${seedItem.media_type}/${seedItem.id}/similar?api_key=${TMDB_API_KEY}&page=1`
    );
    
    if (similarResponse.ok) {
      const similarData: TMDBSearchResponse = await similarResponse.json();
      
      // Apply enhanced filtering and preprocessing
      const filteredSimilar = filterAndPreprocessCandidates(
        similarData.results,
        seedItem,
        {
          minRating: 6.0,
          minVoteCount: 100,
          maxAge: 50,
          requireGenreMatch: true
        }
      )
        .filter(item => !seenIds.has(item.id))
        .slice(0, PERFORMANCE_CONFIG.TMDB_SIMILAR_LIMIT);
      
      recommendations.push(...filteredSimilar);
      filteredSimilar.forEach(item => seenIds.add(item.id));
    }
    
    // Strategy 2: Search by genre combinations for more targeted results
    const seedGenres = seedItem.genre_ids;
    if (seedGenres.length > 0) {
      // Search for content with similar genre combinations
      const genreQueries = await Promise.all(
        seedGenres.slice(0, 2).map(async (genreId) => {
          try {
            const response = await fetch(
              `${TMDB_BASE_URL}/discover/${seedItem.media_type}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=100&page=1`
            );
            if (response.ok) {
              const data: TMDBSearchResponse = await response.json();
              
              // Apply enhanced filtering
              return filterAndPreprocessCandidates(
                data.results,
                seedItem,
                {
                  minRating: 6.5,
                  minVoteCount: 200,
                  maxAge: 40,
                  requireGenreMatch: true
                }
              ).filter(item => !seenIds.has(item.id));
            }
          } catch (error) {
            console.warn(`Genre search failed for genre ${genreId}:`, error);
          }
          return [];
        })
      );
      
      const genreResults = genreQueries.flat().slice(0, PERFORMANCE_CONFIG.GENRE_SEARCH_LIMIT);
      recommendations.push(...genreResults);
      genreResults.forEach(item => seenIds.add(item.id));
    }
    
    // Strategy 3: Search by keywords from the title and overview
    const keywords = extractKeywords(seedItem);
    if (keywords.length > 0) {
      const keywordQueries = await Promise.all(
        keywords.slice(0, 3).map(async (keyword) => {
          try {
            const response = await fetch(
              `${TMDB_BASE_URL}/search/${seedItem.media_type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(keyword)}&page=1`
            );
            if (response.ok) {
              const data: TMDBSearchResponse = await response.json();
              
              // Apply enhanced filtering
              return filterAndPreprocessCandidates(
                data.results,
                seedItem,
                {
                  minRating: 6.0,
                  minVoteCount: 150,
                  maxAge: 45,
                  requireGenreMatch: true
                }
              ).filter(item => !seenIds.has(item.id));
            }
          } catch (error) {
            console.warn(`Keyword search failed for ${keyword}:`, error);
          }
          return [];
        })
      );
      
      const keywordResults = keywordQueries.flat().slice(0, PERFORMANCE_CONFIG.KEYWORD_SEARCH_LIMIT);
      recommendations.push(...keywordResults);
      keywordResults.forEach(item => seenIds.add(item.id));
    }
    
    // Strategy 3.5: Search by TMDB keywords for thematic similarity
    try {
      const seedKeywords = await getKeywords(seedItem.id, seedItem.media_type);
      if (seedKeywords.length > 0) {
        // Get the most relevant keywords (limit to top 5 to avoid too broad searches)
        const topKeywords = seedKeywords.slice(0, 5);
        const keywordIds = topKeywords.map(k => k.id);
        
        // Search for content with similar keywords
        const keywordResults = await searchByKeywords(
          keywordIds,
          seedItem.media_type,
          {
            minRating: 6.5,
            minVoteCount: 200,
            maxAge: 40,
            limit: PERFORMANCE_CONFIG.TMDB_KEYWORD_SEARCH_LIMIT
          }
        );
        
        // Filter out items we've already seen and apply genre matching
        const uniqueKeywordResults = keywordResults
          .filter(item => !seenIds.has(item.id))
          .filter(item => hasGenreOverlap(seedItem.genre_ids, item.genre_ids));
        
        recommendations.push(...uniqueKeywordResults);
        uniqueKeywordResults.forEach(item => seenIds.add(item.id));
      }
    } catch (error) {
      console.warn('TMDB keyword search failed:', error);
    }
    
    // Strategy 4: Get recommendations from cast/crew connections
    const credits = await getCredits(seedItem.id, seedItem.media_type);
    if (credits) {
      const keyPeople = credits.cast.slice(0, PERFORMANCE_CONFIG.CAST_CREW_LIMIT).map(p => p.name);
      const crewPeople = credits.crew
        .filter(p => ['Director', 'Writer', 'Creator'].includes(p.job || ''))
        .slice(0, 3)
        .map(p => p.name);
      
      const allPeople = [...keyPeople, ...crewPeople];
      
      for (const person of allPeople.slice(0, 3)) {
        try {
          const response = await fetch(
            `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(person)}&page=1`
          );
          
          if (response.ok) {
            const personData = await response.json();
            if (personData.results.length > 0) {
              const personId = personData.results[0].id;
              const personCredits = await fetch(
                `${TMDB_BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}`
              );
              
              if (personCredits.ok) {
                const creditsData = await personCredits.json();
                const personWorks = creditsData.cast
                  .filter((item: any) => 
                    item.media_type === seedItem.media_type && 
                    !seenIds.has(item.id)
                  )
                  .slice(0, PERFORMANCE_CONFIG.CAST_CREW_LIMIT);
                
                // Apply enhanced filtering to cast/crew recommendations
                const filteredWorks = filterAndPreprocessCandidates(
                  personWorks,
                  seedItem,
                  {
                    minRating: 6.0,
                    minVoteCount: 100,
                    maxAge: 50,
                    requireGenreMatch: false // Allow some flexibility for cast/crew matches
                  }
                );
                
                recommendations.push(...filteredWorks);
                filteredWorks.forEach(item => seenIds.add(item.id));
              }
            }
          }
        } catch (error) {
          console.warn(`Person search failed for ${person}:`, error);
        }
      }
    }
    
    // Strategy 5: Google Custom Search for web-sourced recommendations
    const seedTitle = seedItem.title || seedItem.name || '';
    if (seedTitle && FEATURES.ENABLE_GOOGLE_SEARCH) {
      try {
        const googleResults = await searchGoogleForSimilarContent(seedTitle);
        const googleItems = await Promise.all(
          googleResults.slice(0, PERFORMANCE_CONFIG.GOOGLE_SEARCH_LIMIT).map(result => convertGoogleResultToTMDBItem(result, seedItem, allGenres))
        );
        
        const validGoogleItems = googleItems.filter(Boolean);
        const uniqueGoogleItems = validGoogleItems.filter(item => !seenIds.has(item.id));
        
        // Apply enhanced filtering to Google results
        const filteredGoogleItems = filterAndPreprocessCandidates(
          uniqueGoogleItems,
          seedItem,
          {
            minRating: 5.5, // Slightly lower threshold for web-sourced content
            minVoteCount: 50,
            maxAge: 60,
            requireGenreMatch: false // Allow flexibility for web-sourced content
          }
        );
        
        recommendations.push(...filteredGoogleItems);
        filteredGoogleItems.forEach(item => seenIds.add(item.id));
      } catch (error) {
        console.warn('Google search integration failed:', error);
      }
    }
    
    // FALLBACK: If we don't have enough quality recommendations, add some from the original similar endpoint
    // but mark them as fallback items for scoring purposes
    if (recommendations.length < PERFORMANCE_CONFIG.FALLBACK_THRESHOLD) {
      try {
        const fallbackResponse = await fetch(
          `${TMDB_BASE_URL}/${seedItem.media_type}/${seedItem.id}/similar?api_key=${TMDB_API_KEY}&page=1`
        );
        
        if (fallbackResponse.ok) {
          const fallbackData: TMDBSearchResponse = await fallbackResponse.json();
          const fallbackItems = fallbackData.results
            .filter(item => !seenIds.has(item.id))
            .slice(0, 20 - recommendations.length);
          
          // Mark these as fallback items (they'll get lower scores)
          const fallbackItemsWithFlag = fallbackItems.map(item => ({
            ...item,
            isFallback: true
          }));
          
          recommendations.push(...fallbackItemsWithFlag);
          fallbackItems.forEach(item => seenIds.add(item.id));
        }
      } catch (error) {
        console.warn('Fallback recommendation fetch failed:', error);
      }
    }
    
  } catch (error) {
    console.error('Error in intelligent recommendations:', error);
  }
  
  // Remove duplicates and ensure all items have media_type
  const uniqueRecommendations = recommendations
    .filter((item, index, self) => 
      self.findIndex(t => t.id === item.id) === index
    )
    .map(item => ({ ...item, media_type: seedItem.media_type }))
    .slice(0, PERFORMANCE_CONFIG.MAX_RECOMMENDATIONS); // Limit total results for performance
  
  return uniqueRecommendations;
};

// Helper function to check if two items share at least one genre
const hasGenreOverlap = (seedGenres: number[], candidateGenres: number[]): boolean => {
  return seedGenres.some(genreId => candidateGenres.includes(genreId));
};

// Enhanced candidate filtering and preprocessing
const filterAndPreprocessCandidates = (
  candidates: TMDBItem[],
  seedItem: TMDBItem,
  options: {
    minRating?: number;
    minVoteCount?: number;
    maxAge?: number;
    requireGenreMatch?: boolean;
  } = {}
): TMDBItem[] => {
  const {
    minRating = 6.0,
    minVoteCount = 100,
    maxAge = 50,
    requireGenreMatch = true
  } = options;

  const currentYear = new Date().getFullYear();
  
  return candidates.filter(candidate => {
    // Filter out low-rated items
    if (candidate.vote_average < minRating) return false;
    
    // Filter out items with too few votes
    if (candidate.vote_count < minVoteCount) return false;
    
    // Filter out very old items
    const releaseYear = parseInt(getReleaseYear(candidate));
    if (!isNaN(releaseYear) && (currentYear - releaseYear) > maxAge) return false;
    
    // Filter out items without genre match (if required)
    if (requireGenreMatch && !hasGenreOverlap(seedItem.genre_ids, candidate.genre_ids)) {
      return false;
    }
    
    return true;
  });
};

// Calculate genre rarity weights
const calculateGenreRarityWeights = (allGenres: TMDBGenre[], seedGenres: number[]): Map<number, number> => {
  const rarityWeights = new Map<number, number>();
  
  // Assign higher weights to rarer genres
  const genreFrequency: { [key: number]: number } = {};
  
  // Initialize frequency counter
  allGenres.forEach(genre => {
    genreFrequency[genre.id] = 0;
  });
  
  // Count genre occurrences (this would ideally be calculated from a larger dataset)
  // For now, we'll use predefined rarity weights
  const rarityMap: { [key: number]: number } = {
    // Very rare genres get higher weights
    10770: 2.0, // TV Movie
    10752: 1.8, // War
    99: 1.6,    // Documentary
    10751: 1.5, // Family
    16: 1.4,    // Animation
    37: 1.3,    // Western
    10402: 1.2, // Music
    10749: 1.1, // Romance
    
    // Common genres get standard weights
    28: 1.0,   // Action
    12: 1.0,   // Adventure
    35: 1.0,   // Comedy
    80: 1.0,   // Crime
    18: 1.0,   // Drama
    27: 1.0,   // Horror
    9648: 1.0, // Mystery
    878: 1.0,  // Science Fiction
    53: 1.0,   // Thriller
  };
  
  seedGenres.forEach(genreId => {
    rarityWeights.set(genreId, rarityMap[genreId] || 1.0);
  });
  
  return rarityWeights;
};

// Map OMDb genres to TMDB genre IDs
const mapOMDbGenresToTMDB = (omdbGenres: string, allGenres: TMDBGenre[]): number[] => {
  if (!omdbGenres) return [];
  
  const genreMap: { [key: string]: string[] } = {
    'Action': ['Action', 'Adventure', 'Thriller'],
    'Adventure': ['Adventure', 'Action', 'Fantasy'],
    'Animation': ['Animation', 'Family'],
    'Biography': ['Drama', 'History'],
    'Comedy': ['Comedy', 'Romance'],
    'Crime': ['Crime', 'Drama', 'Thriller'],
    'Documentary': ['Documentary'],
    'Drama': ['Drama', 'Romance'],
    'Family': ['Family', 'Adventure', 'Comedy'],
    'Fantasy': ['Fantasy', 'Adventure', 'Drama'],
    'Film-Noir': ['Drama', 'Thriller'],
    'Game-Show': ['Reality'],
    'History': ['History', 'Drama', 'War'],
    'Horror': ['Horror', 'Thriller'],
    'Music': ['Music', 'Drama'],
    'Musical': ['Music', 'Romance'],
    'Mystery': ['Mystery', 'Thriller', 'Drama'],
    'News': ['News'],
    'Reality-TV': ['Reality'],
    'Romance': ['Romance', 'Drama', 'Comedy'],
    'Sci-Fi': ['Science Fiction', 'Action', 'Adventure'],
    'Sport': ['Sport'],
    'Talk-Show': ['Talk-Show'],
    'Thriller': ['Thriller', 'Action', 'Drama'],
    'War': ['War', 'Action', 'Drama'],
    'Western': ['Western', 'Action', 'Drama']
  };
  
  const omdbGenreList = omdbGenres.split(', ').map(g => g.trim());
  const mappedGenreIds: number[] = [];
  
  for (const omdbGenre of omdbGenreList) {
    const possibleTMDBGenres = genreMap[omdbGenre] || [omdbGenre];
    for (const tmdbGenre of possibleTMDBGenres) {
      const foundGenre = allGenres.find(g => 
        g.name.toLowerCase().includes(tmdbGenre.toLowerCase()) ||
        tmdbGenre.toLowerCase().includes(g.name.toLowerCase())
      );
      if (foundGenre && !mappedGenreIds.includes(foundGenre.id)) {
        mappedGenreIds.push(foundGenre.id);
      }
    }
  }
  
  return mappedGenreIds;
};

// Extract meaningful keywords from title and overview
const extractKeywords = (item: TMDBItem): string[] => {
  const text = `${item.title || item.name || ''} ${item.overview}`.toLowerCase();
  
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);
  
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .filter(word => /^[a-zA-Z]+$/.test(word)); // Only alphabetic words
  
  // Count frequency and return most common meaningful words
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

// Enhanced text similarity using semantic embeddings and TMDB keywords
const calculateTextSimilarity = async (seedItem: TMDBItem, candidateItem: TMDBItem): Promise<number> => {
  try {
    // Combine overview and tagline for seed item
    const seedText = seedItem.tagline 
      ? `${seedItem.overview} ${seedItem.tagline}`
      : seedItem.overview;
    
    const candidateText = candidateItem.overview;
    
    // Use semantic embeddings for similarity
    const similarity = await getSemanticSimilarity(seedText, candidateText);
    
    // Add bonus for tagline matches (taglines are often more distinctive)
    let taglineBonus = 0;
    if (seedItem.tagline && candidateItem.tagline) {
      const taglineSimilarity = await getSemanticSimilarity(seedItem.tagline, candidateItem.tagline);
      taglineBonus = Math.min(0.1, taglineSimilarity * 0.1);
    }
    
    // Add bonus for TMDB keyword matches
    let keywordBonus = 0;
    try {
      const [seedKeywords, candidateKeywords] = await Promise.all([
        getKeywords(seedItem.id, seedItem.media_type),
        getKeywords(candidateItem.id, candidateItem.media_type)
      ]);
      
      if (seedKeywords.length > 0 && candidateKeywords.length > 0) {
        // Calculate keyword overlap
        const seedKeywordNames = new Set(seedKeywords.map(k => k.name.toLowerCase()));
        const candidateKeywordNames = new Set(candidateKeywords.map(k => k.name.toLowerCase()));
        
        const commonKeywords = [...seedKeywordNames].filter(name => candidateKeywordNames.has(name));
        const totalKeywords = new Set([...seedKeywordNames, ...candidateKeywordNames]);
        
        if (totalKeywords.size > 0) {
          const keywordOverlap = commonKeywords.length / totalKeywords.size;
          keywordBonus = Math.min(0.15, keywordOverlap * 0.15);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch keywords for similarity calculation:', error);
    }
    
    return Math.min(1, similarity + taglineBonus + keywordBonus);
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    
    // Fallback to keyword-based similarity
    return calculateKeywordSimilarity(seedItem, candidateItem);
  }
};

// Fallback keyword-based similarity (used when embeddings fail)
const calculateKeywordSimilarity = (seedItem: TMDBItem, candidateItem: TMDBItem): number => {
  const normalizeText = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
  };

  // Combine overview and tagline for seed item
  const seedText = seedItem.tagline 
    ? `${seedItem.overview} ${seedItem.tagline}`
    : seedItem.overview;
  
  const seedWords = normalizeText(seedText);
  const candidateWords = normalizeText(candidateItem.overview);
  
  // Calculate word overlap
  const commonWords = seedWords.filter(word => candidateWords.includes(word));
  const uniqueWords = new Set([...seedWords, ...candidateWords]);
  
  // Jaccard similarity
  const jaccardSimilarity = commonWords.length / uniqueWords.size;
  
  // Weighted by word frequency (rare words get higher weight)
  const wordFrequency = new Map<string, number>();
  [...seedWords, ...candidateWords].forEach(word => {
    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
  });
  
  const rareWordBonus = commonWords
    .filter(word => wordFrequency.get(word)! <= 2)
    .length * 0.1;
  
  // Bonus for tagline matches (taglines are often more distinctive)
  let taglineBonus = 0;
  if (seedItem.tagline && candidateItem.tagline) {
    const seedTaglineWords = normalizeText(seedItem.tagline);
    const candidateTaglineWords = normalizeText(candidateItem.tagline);
    const taglineCommonWords = seedTaglineWords.filter(word => candidateTaglineWords.includes(word));
    taglineBonus = Math.min(0.2, taglineCommonWords.length * 0.05);
  }
  
  return Math.min(1, jaccardSimilarity + rareWordBonus + taglineBonus);
};

// Calculate keyword similarity score based on TMDB keywords with enhanced weighting
const calculateKeywordSimilarityScore = async (
  seedItem: TMDBItem, 
  candidateItem: TMDBItem
): Promise<{ score: number, commonKeywords: string[] }> => {
  try {
    const [seedKeywords, candidateKeywords] = await Promise.all([
      getKeywords(seedItem.id, seedItem.media_type),
      getKeywords(candidateItem.id, candidateItem.media_type)
    ]);
    
    if (seedKeywords.length === 0 || candidateKeywords.length === 0) {
      return { score: 0, commonKeywords: [] };
    }
    
    // Find common keywords
    const seedKeywordNames = new Set(seedKeywords.map(k => k.name.toLowerCase()));
    const candidateKeywordNames = new Set(candidateKeywords.map(k => k.name.toLowerCase()));
    
    const commonKeywords = [...seedKeywordNames].filter(name => candidateKeywordNames.has(name));
    
    if (commonKeywords.length === 0) {
      return { score: 0, commonKeywords: [] };
    }
    
    // Calculate score based on keyword overlap and rarity
    const totalKeywords = new Set([...seedKeywordNames, ...candidateKeywords]);
    const overlapRatio = commonKeywords.length / totalKeywords.size;
    
    // Base score from overlap (0-25 points) - INCREASED
    const baseScore = overlapRatio * 25;
    
    // Enhanced bonus for multiple keyword matches (0-8 points) - INCREASED
    const multipleKeywordBonus = Math.min(8, commonKeywords.length * 1.5);
    
    // Enhanced bonus for rare/unique keywords (0-8 points) - INCREASED
    const rareKeywordBonus = Math.min(8, commonKeywords.length * 1);
    
    // Perfect keyword match bonus (0-4 points) - NEW
    const perfectMatchBonus = commonKeywords.length === Math.min(seedKeywords.length, candidateKeywords.length) ? 4 : 0;
    
    const totalScore = Math.min(45, baseScore + multipleKeywordBonus + rareKeywordBonus + perfectMatchBonus);
    
    return {
      score: Math.round(totalScore),
      commonKeywords: commonKeywords.map(name => 
        seedKeywords.find(k => k.name.toLowerCase() === name)?.name || name
      )
    };
  } catch (error) {
    console.warn('Failed to calculate keyword similarity score:', error);
    return { score: 0, commonKeywords: [] };
  }
};

// Calculate genre overlap with enhanced rarity weighting and normalization
const calculateGenreScore = (
  seedGenres: number[], 
  candidateGenres: number[], 
  allGenres: TMDBGenre[],
  rarityWeights: Map<number, number>
): { score: number, commonGenres: string[] } => {
  const commonGenres = candidateGenres.filter(genreId => seedGenres.includes(genreId));
  
  if (commonGenres.length === 0) return { score: 0, commonGenres: [] };
  
  // Calculate weighted genre score based on rarity
  let totalWeight = 0;
  commonGenres.forEach(genreId => {
    const rarityWeight = rarityWeights.get(genreId) || 1.0;
    totalWeight += rarityWeight;
  });
  
  // Normalize by number of shared genres
  const avgWeight = totalWeight / commonGenres.length;
  
  // Base score from genre overlap (0-80 points) - INCREASED
  const baseScore = (commonGenres.length / Math.max(seedGenres.length, 1)) * 80;
  
  // Enhanced rarity bonus (0-30 points) - INCREASED
  const rarityBonus = Math.min(30, avgWeight * 15);
  
  // Multiple genre bonus (0-15 points) - INCREASED
  const multipleGenreBonus = commonGenres.length > 1 ? 15 : 0;
  
  // Genre diversity bonus (0-15 points) - INCREASED
  const diversityBonus = Math.min(15, commonGenres.length * 3);
  
  // Perfect genre match bonus (0-10 points) - NEW
  const perfectMatchBonus = commonGenres.length === seedGenres.length ? 10 : 0;
  
  const genreNames = commonGenres.map(id => allGenres.find(g => g.id === id)?.name).filter(Boolean);
  
  return {
    score: Math.min(150, baseScore + rarityBonus + multipleGenreBonus + diversityBonus + perfectMatchBonus),
    commonGenres: genreNames
  };
};

// Calculate cast and crew similarity
const calculateCastCrewScore = async (seedId: number, seedMediaType: 'movie' | 'tv', candidateId: number, candidateMediaType: 'movie' | 'tv'): Promise<number> => {
  try {
    const [seedCredits, candidateCredits] = await Promise.all([
      getCredits(seedId, seedMediaType),
      getCredits(candidateId, candidateMediaType)
    ]);
    
    if (!seedCredits || !candidateCredits) return 0;
    
    // Extract key people (top 10 cast, directors, writers)
    const seedKeyPeople = new Set([
      ...seedCredits.cast.slice(0, 10).map(p => p.name),
      ...seedCredits.crew.filter(p => ['Director', 'Writer', 'Screenplay'].includes(p.job || '')).map(p => p.name)
    ]);
    
    const candidateKeyPeople = new Set([
      ...candidateCredits.cast.slice(0, 10).map(p => p.name),
      ...candidateCredits.crew.filter(p => ['Director', 'Writer', 'Screenplay'].includes(p.job || '')).map(p => p.name)
    ]);
    
    // Calculate overlap
    const commonPeople = [...seedKeyPeople].filter(name => candidateKeyPeople.has(name));
    
    if (commonPeople.length === 0) return 0;
    
    // Weight by importance (directors/writers get higher weight)
    let score = 0;
    commonPeople.forEach(name => {
      const isDirector = seedCredits.crew.some(p => p.name === name && p.job === 'Director') &&
                        candidateCredits.crew.some(p => p.name === name && p.job === 'Director');
      const isWriter = seedCredits.crew.some(p => p.name === name && ['Writer', 'Screenplay'].includes(p.job || '')) &&
                      candidateCredits.crew.some(p => p.name === name && ['Writer', 'Screenplay'].includes(p.job || ''));
      
      if (isDirector) score += 15;
      else if (isWriter) score += 10;
      else score += 5; // Actor
    });
    
    return Math.min(40, score);
  } catch (error) {
    console.error('Error calculating cast/crew score:', error);
    return 0;
  }
};

// Calculate tone and mood similarity
const calculateToneScore = (seedItem: TMDBItem, candidateItem: TMDBItem): number => {
  const seedText = `${seedItem.overview} ${seedItem.tagline || ''}`.toLowerCase();
  const candidateText = candidateItem.overview.toLowerCase();
  
  // Define tone indicators
  const seriousTones = ['dark', 'gritty', 'serious', 'dramatic', 'intense', 'violent', 'crime', 'murder', 'corruption', 'politics', 'social', 'realistic'];
  const lightTones = ['funny', 'comedy', 'light', 'cheerful', 'family', 'feel-good', 'romantic', 'adventure', 'fantasy', 'magical'];
  const actionTones = ['action', 'thriller', 'suspense', 'adventure', 'war', 'fighting', 'chase', 'explosion'];
  const mysteryTones = ['mystery', 'suspense', 'thriller', 'investigation', 'detective', 'clue', 'puzzle'];
  
  let seedTone = 'neutral';
  let candidateTone = 'neutral';
  
  // Determine seed tone
  if (seriousTones.some(tone => seedText.includes(tone))) seedTone = 'serious';
  else if (lightTones.some(tone => seedText.includes(tone))) seedTone = 'light';
  else if (actionTones.some(tone => seedText.includes(tone))) seedTone = 'action';
  else if (mysteryTones.some(tone => seedText.includes(tone))) seedTone = 'mystery';
  
  // Determine candidate tone
  if (seriousTones.some(tone => candidateText.includes(tone))) candidateTone = 'serious';
  else if (lightTones.some(tone => candidateText.includes(tone))) candidateTone = 'light';
  else if (actionTones.some(tone => candidateText.includes(tone))) candidateTone = 'action';
  else if (mysteryTones.some(tone => candidateText.includes(tone))) candidateTone = 'mystery';
  
  // Score based on tone compatibility
  if (seedTone === candidateTone) return 20;
  if ((seedTone === 'serious' && candidateTone === 'mystery') || 
      (seedTone === 'mystery' && candidateTone === 'serious')) return 15;
  if ((seedTone === 'action' && candidateTone === 'thriller') || 
      (seedTone === 'thriller' && candidateTone === 'action')) return 15;
  if (seedTone === 'light' && candidateTone === 'light') return 10;
  
  return 0;
};

// Enhanced scoring algorithm with focus on genre and keywords
export const scoreRecommendations = async (
  seedItem: TMDBItem, 
  recommendations: TMDBItem[], 
  genres: TMDBGenre[]
): Promise<ScoredRecommendation[]> => {
  const scoredRecommendations: ScoredRecommendation[] = [];
  
  for (const item of recommendations) {
    try {
      let totalScore = 0;
      const justificationParts: string[] = [];
      
      // 1. Genre overlap with enhanced rarity weighting (0-120 points) - INCREASED
      const rarityWeights = calculateGenreRarityWeights(genres, seedItem.genre_ids);
      const genreResult = calculateGenreScore(seedItem.genre_ids, item.genre_ids, genres, rarityWeights);
      totalScore += genreResult.score;
      
      // PENALTY for fallback items that don't match genres
      if (item.isFallback) {
        totalScore = Math.max(0, totalScore - 40); // Increased penalty for non-genre matches
        justificationParts.push('Fallback recommendation (limited genre match)');
      }
      
      // BOOST for Google-sourced items to increase diversity
      if (item.isGoogleSourced) {
        totalScore = Math.min(120, totalScore + 5); // Small boost for diversity
        if (item.googleSnippet) {
          justificationParts.push('Curated web recommendation');
        }
      }
      
      if (genreResult.commonGenres.length > 0) {
        if (genreResult.commonGenres.length > 1) {
          justificationParts.push(`Shares ${genreResult.commonGenres.slice(0, 3).join(', ')} themes`);
        } else {
          justificationParts.push(`Shares ${genreResult.commonGenres[0]} themes`);
        }
      }
      
      // 2. TMDB rating with vote count reliability (0-20 points) - REDUCED
      const normalizedRating = Math.max(0, Math.min(1, (item.vote_average - 1) / 9)); // Normalize 1-10 to 0-1
      const ratingScore = normalizedRating * 15;
      const voteReliabilityBonus = Math.min(5, Math.log10(Math.max(1, item.vote_count)) * 1.5);
      const totalRatingScore = ratingScore + voteReliabilityBonus;
      totalScore += totalRatingScore;
      
      if (item.vote_average >= 7) {
        justificationParts.push(`High rating (${item.vote_average.toFixed(1)})`);
      }
      if (item.vote_count > 1000) {
        justificationParts.push('Well-rated by many viewers');
      }
      
      // 3. Enhanced description similarity using semantic embeddings (0-25 points) - INCREASED
      const descriptionScore = await calculateTextSimilarity(seedItem, item) * 25;
      totalScore += descriptionScore;
      
      if (descriptionScore > 12) {
        justificationParts.push('Similar plot elements and themes');
      }
      
      // 4. Cast and crew similarity (0-30 points) - REDUCED
      let castCrewScore = 0;
      try {
        castCrewScore = await calculateCastCrewScore(seedItem.id, seedItem.media_type, item.id, item.media_type);
      } catch (error) {
        console.warn(`Failed to calculate cast/crew score for item ${item.id}:`, error);
        castCrewScore = 0;
      }
      totalScore += castCrewScore;
      
      if (castCrewScore > 15) {
        justificationParts.push('Shares key cast/crew members');
      } else if (castCrewScore > 8) {
        justificationParts.push('Some cast/crew overlap');
      }
      
      // 5. Popularity and trending (0-10 points) - REDUCED
      const normalizedPopularity = Math.min(1, Math.log10(Math.max(1, item.vote_count)) / 5); // Normalize to 0-1
      const popularityScore = normalizedPopularity * 10;
      totalScore += popularityScore;
      
      if (item.vote_count > 5000) {
        justificationParts.push('Popular and well-known');
      }
      
      // 6. Tone and mood similarity (0-25 points) - INCREASED
      const toneScore = calculateToneScore(seedItem, item);
      totalScore += toneScore;
      
      if (toneScore > 18) {
        justificationParts.push('Similar tone and atmosphere');
      }
      
      // 7. User feedback boost (0-15 points) - REDUCED
      const feedbackBoost = getRecommendationBoost(item);
      totalScore += feedbackBoost;
      
      if (feedbackBoost > 5) {
        justificationParts.push('Matches your preferences');
      }
      
      // 8. Keyword similarity (0-35 points) - INCREASED
      const keywordSimilarityResult = await calculateKeywordSimilarityScore(seedItem, item);
      totalScore += keywordSimilarityResult.score;
      
      if (keywordSimilarityResult.score > 15) {
        justificationParts.push(`Shares thematic keywords: ${keywordSimilarityResult.commonKeywords.join(', ')}`);
      }
      
      // Ensure score doesn't exceed 120 (increased max due to higher genre weight)
      totalScore = Math.min(120, totalScore);
      
      // Create comprehensive justification
      let finalJustification = justificationParts.join(', ');
      
      // Add Google source context if available
      if (item.isGoogleSourced && item.googleSnippet) {
        const snippetPreview = item.googleSnippet.length > 100 
          ? item.googleSnippet.substring(0, 100) + '...'
          : item.googleSnippet;
        finalJustification += ` | Web source: ${snippetPreview}`;
      }
      
      scoredRecommendations.push({
        ...item,
        score: Math.round(totalScore),
        justification: finalJustification || 'Similar content style',
        scoreBreakdown: {
          genreScore: Math.round(genreResult.score),
          ratingScore: Math.round(totalRatingScore),
          descriptionScore: Math.round(descriptionScore),
          castCrewScore: Math.round(castCrewScore),
          popularityScore: Math.round(popularityScore),
          toneScore: Math.round(toneScore),
          keywordScore: Math.round(keywordSimilarityResult.score)
        }
      });
    } catch (error) {
      console.error(`Error scoring item ${item.id}:`, error);
      // Fallback scoring for failed items
      const fallbackScore = Math.round((item.vote_average / 10) * 50);
      scoredRecommendations.push({
        ...item,
        score: fallbackScore,
        justification: 'Basic similarity score',
        scoreBreakdown: {
          genreScore: 0,
          ratingScore: fallbackScore,
          descriptionScore: 0,
          castCrewScore: 0,
          popularityScore: 0,
          toneScore: 0,
          keywordScore: 0
        }
      });
    }
  }
  
  // Sort by total score descending
  return scoredRecommendations.sort((a, b) => b.score - a.score);
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