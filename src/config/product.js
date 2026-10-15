/**
 * Centralized Product Configuration for Atlas
 * Any branding or product name updates should be made here.
 */
export const PRODUCT_CONFIG = {
  name: 'Atlas',
  agentName: 'Atlas',
  category: 'Document Intelligence',
  tagline: 'Understand Documents. Discover Knowledge.',
  technology: 'Vectorless RAG',
  shortDescription: 'Hierarchical tree-based document retrieval and synthesis workspace.',
  models: {
    chat: 'Qwen 2.5 / Groq Fallback',
    retrieval: 'Llama 3.1 / Groq Fallback',
    method: 'Vectorless Tree Index',
  },
  version: '2.0.0',
}
