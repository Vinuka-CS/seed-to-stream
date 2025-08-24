import { useState, useEffect } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { TMDBItem, ScoredRecommendation, getSimilar, scoreRecommendations, getGenres, TMDBGenre } from '@/utils/tmdb';

interface RecommendationListProps {
  seedItem: TMDBItem | null;
}

export const RecommendationList = ({ seedItem }: RecommendationListProps) => {
  const [recommendations, setRecommendations] = useState<ScoredRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seedItem) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch similar items and genres in parallel
        const [similarItems, movieGenres, tvGenres] = await Promise.all([
          getSimilar(seedItem.id, seedItem.media_type),
          getGenres('movie'),
          getGenres('tv')
        ]);

        // Combine all genres
        const allGenres: TMDBGenre[] = [...movieGenres, ...tvGenres];
        
        // Score and sort recommendations
        const scoredRecommendations = scoreRecommendations(seedItem, similarItems, allGenres);
        
        setRecommendations(scoredRecommendations.slice(0, 12)); // Show top 12
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [seedItem]);

  if (!seedItem) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-cinema flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Ready to Discover?
          </h2>
          <p className="text-muted-foreground">
            Search for a movie or TV show above to get personalized recommendations based on our advanced scoring algorithm.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Finding Perfect Matches...
          </h2>
          <p className="text-muted-foreground">
            Analyzing genres, ratings, and release patterns
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="cinema-card">
              <div className="loading-pulse h-80 w-full"></div>
              <div className="p-4 space-y-2">
                <div className="loading-pulse h-4 w-3/4"></div>
                <div className="loading-pulse h-3 w-1/2"></div>
                <div className="loading-pulse h-3 w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            No Recommendations Found
          </h2>
          <p className="text-muted-foreground">
            We couldn't find similar content for this title. Try selecting a different seed item.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Recommendations for You
        </h2>
        <p className="text-muted-foreground">
          Found {recommendations.length} similar titles, scored by our algorithm
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendations.map((item) => (
          <RecommendationCard
            key={`${item.id}-${item.media_type}`}
            item={item}
            showScore={true}
          />
        ))}
      </div>
    </div>
  );
};