import { TMDBItem } from './tmdb';

export interface CatalogueItem extends TMDBItem {
  addedDate: string;
  userRating?: number;
}

export interface UserRating {
  id: number;
  rating: number;
  mediaType: 'movie' | 'tv';
}

const CATALOGUE_KEY = 'movie-app-catalogue';
const RATINGS_KEY = 'movie-app-ratings';

// Catalogue management
export const getCatalogue = (): CatalogueItem[] => {
  try {
    const stored = localStorage.getItem(CATALOGUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading catalogue:', error);
    return [];
  }
};

export const addToCatalogue = (item: TMDBItem): void => {
  try {
    const catalogue = getCatalogue();
    const existingIndex = catalogue.findIndex(catalogueItem => 
      catalogueItem.id === item.id && catalogueItem.media_type === item.media_type
    );
    
    if (existingIndex === -1) {
      const catalogueItem: CatalogueItem = {
        ...item,
        addedDate: new Date().toISOString()
      };
      catalogue.unshift(catalogueItem);
      localStorage.setItem(CATALOGUE_KEY, JSON.stringify(catalogue));
    }
  } catch (error) {
    console.error('Error adding to catalogue:', error);
  }
};

export const removeFromCatalogue = (id: number, mediaType: 'movie' | 'tv'): void => {
  try {
    const catalogue = getCatalogue();
    const filtered = catalogue.filter(item => 
      !(item.id === id && item.media_type === mediaType)
    );
    localStorage.setItem(CATALOGUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from catalogue:', error);
  }
};

export const isInCatalogue = (id: number, mediaType: 'movie' | 'tv'): boolean => {
  try {
    const catalogue = getCatalogue();
    return catalogue.some(item => item.id === id && item.media_type === mediaType);
  } catch (error) {
    console.error('Error checking catalogue:', error);
    return false;
  }
};

// User ratings management
export const getUserRatings = (): UserRating[] => {
  try {
    const stored = localStorage.getItem(RATINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading ratings:', error);
    return [];
  }
};

export const setUserRating = (id: number, mediaType: 'movie' | 'tv', rating: number): void => {
  try {
    const ratings = getUserRatings();
    const existingIndex = ratings.findIndex(r => 
      r.id === id && r.mediaType === mediaType
    );
    
    if (existingIndex >= 0) {
      ratings[existingIndex].rating = rating;
    } else {
      ratings.push({ id, mediaType, rating });
    }
    
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  } catch (error) {
    console.error('Error setting rating:', error);
  }
};

export const getUserRating = (id: number, mediaType: 'movie' | 'tv'): number | undefined => {
  try {
    const ratings = getUserRatings();
    const rating = ratings.find(r => r.id === id && r.mediaType === mediaType);
    return rating?.rating;
  } catch (error) {
    console.error('Error getting rating:', error);
    return undefined;
  }
};

export const removeUserRating = (id: number, mediaType: 'movie' | 'tv'): void => {
  try {
    const ratings = getUserRatings();
    const filtered = ratings.filter(r => 
      !(r.id === id && r.mediaType === mediaType)
    );
    localStorage.setItem(RATINGS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing rating:', error);
  }
};