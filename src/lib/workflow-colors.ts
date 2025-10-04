// Block color mapping to match workflow builder UI

export const BLOCK_COLORS: Record<string, string> = {
  // IO - Gray
  'read_csv': 'bg-gray-600',
  'upload_csv': 'bg-gray-600',
  'write_csv': 'bg-gray-600',
  
  // Enrichment - Purple
  'enrich_people': 'bg-purple-600',
  'enrich_companies': 'bg-purple-600',
  'lead_enrichment': 'bg-purple-600',
  'company_enrichment': 'bg-purple-600',
  
  // Research - Teal/Gray
  'research_agent': 'bg-gray-500',
  'web_research_agent': 'bg-teal-600',
  
  // Find - Orange
  'find_email': 'bg-orange-500',
  'find_phone': 'bg-orange-500',
  
  // Transform - Blue
  'filter': 'bg-blue-600',
  'find_subdomains': 'bg-cyan-600',
  
  // Signal - Purple
  'email_generate': 'bg-purple-600',
  'generate_email': 'bg-purple-600',
  
  // Export - Green
  'email_save_drafts': 'bg-green-600',
  'save_campaign': 'bg-green-600',
}

export function getBlockColor(blockName: string, blockType?: string): string {
  const normalized = blockName.toLowerCase()
  return BLOCK_COLORS[normalized] || 'bg-gray-500'
}
