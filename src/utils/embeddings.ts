import { API_CONFIG } from '@/config/api';

// OpenAI Embeddings API configuration
const OPENAI_API_KEY = API_CONFIG.OPENAI_API_KEY;
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

// Embedding model to use
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Cache for embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

// Interface for embedding response
interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Get embeddings for text using OpenAI API
export const getEmbeddings = async (text: string): Promise<number[]> => {
  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.warn('OpenAI API not configured, falling back to keyword-based similarity');
    return [];
  }

  try {
    const response = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: EMBEDDING_MODEL,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data: OpenAIEmbeddingResponse = await response.json();
    const embedding = data.data[0].embedding;

    // Cache the embedding
    embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    return [];
  }
};

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

// Get semantic similarity between two text items
export const getSemanticSimilarity = async (
  textA: string, 
  textB: string
): Promise<number> => {
  try {
    const [embeddingA, embeddingB] = await Promise.all([
      getEmbeddings(textA),
      getEmbeddings(textB),
    ]);

    if (embeddingA.length === 0 || embeddingB.length === 0) {
      // Fallback to keyword-based similarity if embeddings fail
      return getKeywordSimilarity(textA, textB);
    }

    return cosineSimilarity(embeddingA, embeddingB);
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    // Fallback to keyword-based similarity
    return getKeywordSimilarity(textA, textB);
  }
};

// Fallback keyword-based similarity (used when embeddings fail)
const getKeywordSimilarity = (textA: string, textB: string): number => {
  const normalizeText = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
  };

  const wordsA = normalizeText(textA);
  const wordsB = normalizeText(textB);

  const commonWords = wordsA.filter(word => wordsB.includes(word));
  const uniqueWords = new Set([...wordsA, ...wordsB]);

  if (uniqueWords.size === 0) return 0;

  return commonWords.length / uniqueWords.size;
};

// Batch get embeddings for multiple texts
export const getBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
  const embeddings = await Promise.all(
    texts.map(text => getEmbeddings(text))
  );
  return embeddings;
};

// Pre-compute embeddings for a list of items
export const precomputeEmbeddings = async (items: Array<{ id: string | number; text: string }>): Promise<Map<string | number, number[]>> => {
  const embeddingsMap = new Map<string | number, number[]>();
  
  for (const item of items) {
    const embedding = await getEmbeddings(item.text);
    if (embedding.length > 0) {
      embeddingsMap.set(item.id, embedding);
    }
  }
  
  return embeddingsMap;
};
