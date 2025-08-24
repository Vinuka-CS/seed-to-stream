import { useState, useEffect } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { TMDBItem, ScoredRecommendation, getIntelligentRecommendations, scoreRecommendations, getGenres, TMDBGenre } from '@/utils/tmdb';

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
        // Use the new intelligent recommendation system
        const [intelligentResults, movieGenres, tvGenres] = await Promise.all([
          getIntelligentRecommendations(seedItem),
          getGenres('movie'),
          getGenres('tv')
        ]);

        // Combine all genres
        const allGenres: TMDBGenre[] = [...movieGenres, ...tvGenres];
        
        // Score and sort recommendations using the enhanced algorithm
        const scoredRecommendations = await scoreRecommendations(seedItem, intelligentResults, allGenres);
        
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
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Select a Seed Title
          </h2>
          <p className="text-muted-foreground">
            Search for a movie or TV show above to get intelligent recommendations based on our enhanced algorithm.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center animate-spin">
            <span className="text-4xl">⚡</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Analyzing Your Selection
          </h2>
          <p className="text-muted-foreground">
            Our intelligent algorithm is analyzing genres, cast, crew, tone, era, and content similarity...
          </p>
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
          AI-Powered Recommendations
        </h2>
        <p className="text-muted-foreground">
          Found {recommendations.length} similar titles using our intelligent discovery algorithm
        </p>
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Scores consider: Genre overlap, Cast/Crew similarity, Content analysis, Tone matching, Era similarity, Ratings, and Popularity</p>
        </div>
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