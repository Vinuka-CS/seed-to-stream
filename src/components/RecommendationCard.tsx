import { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { TMDBItem, ScoredRecommendation, getDisplayTitle, getReleaseYear, getImageUrl } from '@/utils/tmdb';
import { isInCatalogue, addToCatalogue, removeFromCatalogue, getUserRating, setUserRating } from '@/utils/storage';

interface RecommendationCardProps {
  item: TMDBItem | ScoredRecommendation;
  showScore?: boolean;
  showRemove?: boolean;
  onCatalogueChange?: () => void;
}

export const RecommendationCard = ({ 
  item, 
  showScore = false, 
  showRemove = false,
  onCatalogueChange 
}: RecommendationCardProps) => {
  const [inCatalogue, setInCatalogue] = useState(isInCatalogue(item.id, item.media_type));
  const [userRating, setUserRatingState] = useState(getUserRating(item.id, item.media_type) || 0);

  const handleCatalogueToggle = () => {
    if (inCatalogue) {
      removeFromCatalogue(item.id, item.media_type);
      setInCatalogue(false);
    } else {
      addToCatalogue(item);
      setInCatalogue(true);
    }
    onCatalogueChange?.();
  };

  const handleRatingChange = (rating: number) => {
    setUserRating(item.id, item.media_type, rating);
    setUserRatingState(rating);
  };

  const scoredItem = item as ScoredRecommendation;

  return (
    <div className="cinema-card group">
      {/* Poster Image */}
      <div className="relative overflow-hidden">
        <img
          src={getImageUrl(item.poster_path, 'w500')}
          alt={getDisplayTitle(item)}
          className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Score Badge */}
        {showScore && scoredItem.score !== undefined && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-bold">
            {scoredItem.score}
          </div>
        )}
        
        {/* Catalogue Button */}
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant={inCatalogue ? "default" : "secondary"}
            onClick={handleCatalogueToggle}
            className="h-8 w-8 p-0"
          >
            {inCatalogue ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Meta */}
        <div>
          <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
            {getDisplayTitle(item)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {item.media_type === 'movie' ? 'Movie' : 'TV Show'} • {getReleaseYear(item)}
          </p>
        </div>

        {/* Ratings */}
        <div className="space-y-2">
          {/* TMDB Rating */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">TMDB:</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">⭐ {item.vote_average.toFixed(1)}</span>
            </div>
          </div>
          
          {/* User Rating */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your Rating:</span>
            <StarRating
              rating={userRating}
              onRatingChange={handleRatingChange}
              size="sm"
            />
          </div>
        </div>

        {/* Justification */}
        {showScore && scoredItem.justification && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {scoredItem.justification}
          </p>
        )}

        {/* Remove Button (for catalogue view) */}
        {showRemove && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCatalogueToggle}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Catalogue
          </Button>
        )}
      </div>
    </div>
  );
};