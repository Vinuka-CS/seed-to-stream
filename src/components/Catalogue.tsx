import { useState, useEffect } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { CatalogueItem, getCatalogue } from '@/utils/storage';

export const Catalogue = () => {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);

  const loadCatalogue = () => {
    setCatalogueItems(getCatalogue());
  };

  useEffect(() => {
    loadCatalogue();
  }, []);

  if (catalogueItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-cinema flex items-center justify-center">
            <span className="text-4xl">📚</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your Catalogue is Empty
          </h2>
          <p className="text-muted-foreground">
            Start adding movies and TV shows from your recommendations to build your personal catalogue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          My Catalogue
        </h2>
        <p className="text-muted-foreground">
          {catalogueItems.length} {catalogueItems.length === 1 ? 'item' : 'items'} in your personal collection
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {catalogueItems.map((item) => (
          <RecommendationCard
            key={`${item.id}-${item.media_type}`}
            item={item}
            showRemove={true}
            onCatalogueChange={loadCatalogue}
          />
        ))}
      </div>
    </div>
  );
};