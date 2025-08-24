import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  maxRating?: number; // Allow custom max rating (default 10)
}

export const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  showValue = false,
  maxRating = 10
}: StarRatingProps) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  // Create array of stars based on maxRating
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} transition-colors ${
              star <= rating 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-gray-300 fill-gray-100'
            } ${readonly ? 'cursor-default' : 'cursor-pointer hover:text-yellow-400'}`}
            onClick={() => handleStarClick(star)}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  );
};