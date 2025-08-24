import { useState } from 'react';
import { Plus, Check, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { TMDBItem, ScoredRecommendation, getDisplayTitle, getReleaseYear, getImageUrl } from '@/utils/tmdb';
import { isInCatalogue, addToCatalogue, removeFromCatalogue, getUserRating, setUserRating } from '@/utils/storage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
            {getDisplayTitle(item)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {getReleaseYear(item)} • {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
          </p>
        </div>

        {/* Enhanced Justification */}
        {showScore && scoredItem.justification && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <p className="line-clamp-2">{scoredItem.justification}</p>
          </div>
        )}

        {/* Score Breakdown Tooltip */}
        {showScore && scoredItem.scoreBreakdown && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  Score Details
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="w-64 p-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Score Breakdown:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Genre Overlap:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.genreScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rating & Reliability:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.ratingScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Content Similarity:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.descriptionScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cast & Crew:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.castCrewScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Popularity:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.popularityScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tone & Atmosphere:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.toneScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Era Similarity:</span>
                      <span className="font-mono">{scoredItem.scoreBreakdown.eraScore}</span>
                    </div>
                    <div className="border-t pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total Score:</span>
                        <span className="font-mono">{scoredItem.score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* TMDB Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">TMDB:</span>
            <StarRating rating={item.vote_average / 2} readonly />
            <span className="text-sm text-muted-foreground">
              {item.vote_average.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {item.vote_count.toLocaleString()} votes
          </span>
        </div>

        {/* User Rating */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Your Rating:</span>
          <StarRating 
            rating={userRating} 
            onChange={handleRatingChange}
            size="sm"
          />
        </div>

        {/* Remove Button for Catalogue */}
        {showRemove && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              removeFromCatalogue(item.id, item.media_type);
              onCatalogueChange?.();
            }}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};