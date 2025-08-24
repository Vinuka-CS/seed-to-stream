import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TMDBItem, searchMulti, getDisplayTitle, getReleaseYear, getImageUrl, getDetails } from '@/utils/tmdb';

interface SearchBarProps {
  onSeedSelect: (item: TMDBItem) => void;
  selectedSeed: TMDBItem | null;
}

export const SearchBar = ({ onSeedSelect, selectedSeed }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchDebounced = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        try {
          const searchResults = await searchMulti(query);
          setResults(searchResults.slice(0, 8)); // Limit to 8 results
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [query]);

  const handleSeedSelect = async (item: TMDBItem) => {
    try {
      // Fetch additional details including tagline for better scoring
      const details = await getDetails(item.id, item.media_type);
      if (details) {
        const enhancedItem: TMDBItem = {
          ...item,
          tagline: details.tagline || undefined
        };
        onSeedSelect(enhancedItem);
      } else {
        onSeedSelect(item);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      onSeedSelect(item);
    }
    
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const clearSeed = () => {
    onSeedSelect(null as any);
  };

  if (selectedSeed) {
    return (
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="cinema-card p-4">
          <div className="flex items-center gap-4">
            <img
              src={getImageUrl(selectedSeed.poster_path, 'w300')}
              alt={getDisplayTitle(selectedSeed)}
              className="w-16 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Selected Seed: {getDisplayTitle(selectedSeed)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedSeed.media_type === 'movie' ? 'Movie' : 'TV Show'} • {getReleaseYear(selectedSeed)} • ⭐ {selectedSeed.vote_average.toFixed(1)}
              </p>
              {selectedSeed.tagline && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  "{selectedSeed.tagline}"
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSeed}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for movies or TV shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg bg-card border-border focus:border-primary"
        />
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 cinema-glass rounded-lg border border-border max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((item) => (
                <div
                  key={`${item.id}-${item.media_type}`}
                  className="flex items-center gap-3 p-3 hover:bg-cinema-card-hover rounded cursor-pointer transition-colors"
                  onClick={() => handleSeedSelect(item)}
                >
                  <img
                    src={getImageUrl(item.poster_path, 'w300')}
                    alt={getDisplayTitle(item)}
                    className="w-12 h-18 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {getDisplayTitle(item)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Show'} • {getReleaseYear(item)} • ⭐ {item.vote_average.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};