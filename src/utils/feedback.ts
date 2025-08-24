import { TMDBItem } from './tmdb';

// User feedback and rating data
interface UserFeedback {
  itemId: number;
  mediaType: 'movie' | 'tv';
  rating: number; // 1-5 stars
  timestamp: number;
  genres: number[];
  cast: string[];
  crew: string[];
}

// Feedback analysis results
interface FeedbackAnalysis {
  preferredGenres: Map<number, number>; // genreId -> weight
  preferredCast: Map<string, number>; // person -> weight
  preferredCrew: Map<string, number>; // person -> weight
  ratingThreshold: number; // minimum rating to consider positive
  genreWeights: Map<number, number>; // genreId -> rarity weight
}

// Get user feedback from localStorage
export const getUserFeedback = (): UserFeedback[] => {
  try {
    const stored = localStorage.getItem('userFeedback');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading user feedback:', error);
    return [];
  }
};

// Save user feedback to localStorage
export const saveUserFeedback = (feedback: UserFeedback): void => {
  try {
    const existing = getUserFeedback();
    const updated = existing.filter(f => 
      !(f.itemId === feedback.itemId && f.mediaType === feedback.mediaType)
    );
    updated.push(feedback);
    localStorage.setItem('userFeedback', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving user feedback:', error);
  }
};

// Analyze user feedback to determine preferences
export const analyzeUserFeedback = (): FeedbackAnalysis => {
  const feedback = getUserFeedback();
  const analysis: FeedbackAnalysis = {
    preferredGenres: new Map(),
    preferredCast: new Map(),
    preferredCrew: new Map(),
    ratingThreshold: 3.5, // Consider 4-5 star ratings as positive
    genreWeights: new Map(),
  };

  // Calculate genre preferences based on ratings
  feedback.forEach(f => {
    if (f.rating >= analysis.ratingThreshold) {
      f.genres.forEach(genreId => {
        const currentWeight = analysis.preferredGenres.get(genreId) || 0;
        analysis.preferredGenres.set(genreId, currentWeight + f.rating);
      });
    }
  });

  // Calculate cast preferences
  feedback.forEach(f => {
    if (f.rating >= analysis.ratingThreshold) {
      f.cast.forEach(person => {
        const currentWeight = analysis.preferredCast.get(person) || 0;
        analysis.preferredCast.set(person, currentWeight + f.rating);
      });
    }
  });

  // Calculate crew preferences
  feedback.forEach(f => {
    if (f.rating >= analysis.ratingThreshold) {
      f.crew.forEach(person => {
        const currentWeight = analysis.preferredCrew.get(person) || 0;
        analysis.preferredCrew.set(person, currentWeight + f.rating);
      });
    }
  });

  return analysis;
};

// Calculate feedback-based score boost for a candidate item
export const calculateFeedbackBoost = (
  candidate: TMDBItem,
  analysis: FeedbackAnalysis
): number => {
  let boost = 0;

  // Genre preference boost
  candidate.genre_ids.forEach(genreId => {
    const genreWeight = analysis.preferredGenres.get(genreId);
    if (genreWeight) {
      boost += Math.min(10, genreWeight * 0.5); // Cap at 10 points
    }
  });

  // Cast preference boost (would need to fetch cast data)
  // This is a placeholder for when we have cast information
  
  return Math.min(20, boost); // Cap total boost at 20 points
};

// Get personalized genre weights based on user preferences
export const getPersonalizedGenreWeights = (): Map<number, number> => {
  const analysis = analyzeUserFeedback();
  const weights = new Map<number, number>();

  // Normalize genre weights
  let maxWeight = 0;
  analysis.preferredGenres.forEach(weight => {
    maxWeight = Math.max(maxWeight, weight);
  });

  analysis.preferredGenres.forEach((weight, genreId) => {
    if (maxWeight > 0) {
      weights.set(genreId, weight / maxWeight);
    }
  });

  return weights;
};

// Update feedback when user rates an item
export const updateFeedbackForItem = (
  itemId: number,
  mediaType: 'movie' | 'tv',
  rating: number,
  genres: number[],
  cast: string[] = [],
  crew: string[] = []
): void => {
  const feedback: UserFeedback = {
    itemId,
    mediaType,
    rating,
    timestamp: Date.now(),
    genres,
    cast,
    crew,
  };

  saveUserFeedback(feedback);
};

// Get recommendation boost based on user's rating history
export const getRecommendationBoost = (candidate: TMDBItem): number => {
  const analysis = analyzeUserFeedback();
  return calculateFeedbackBoost(candidate, analysis);
};
