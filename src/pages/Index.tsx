import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/SearchBar';
import { RecommendationList } from '@/components/RecommendationList';
import { TMDBItem } from '@/utils/tmdb';

const Index = () => {
  const [selectedSeed, setSelectedSeed] = useState<TMDBItem | null>(null);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-4">
            Seed to Stream
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover your next favorite movie or TV show with our intelligent recommendation engine. 
            Select a seed title and watch the magic happen.
          </p>
          
          {/* Navigation */}
          <div className="flex justify-center mt-6">
            <Link to="/catalogue">
              <Button variant="outline" className="bg-cinema-glass border-primary/20 hover:border-primary/40">
                <Library className="h-4 w-4 mr-2" />
                My Catalogue
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Section */}
        <SearchBar 
          onSeedSelect={setSelectedSeed}
          selectedSeed={selectedSeed}
        />

        {/* Recommendations Section */}
        <RecommendationList seedItem={selectedSeed} />
      </div>
    </div>
  );
};

export default Index;
