interface AIResponse {
  content: string;
  tokens?: number;
}

interface TagSuggestion {
  tag: string;
  confidence: number;
}

const AI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  maxTokens: 500,
  temperature: 0.7,
};

/**
 * Generate SEO meta description from announcement content
 */
export async function generateMetaDescription(
  title: string,
  content: string,
  organization?: string
): Promise<AIResponse> {
  if (!AI_CONFIG.apiKey) {
    // Fallback: extract first sentence or truncate content
    const fallback = content.split('.')[0]?.slice(0, 160) || title;
    return { content: fallback };
  }

  try {
    const prompt = `Generate a compelling SEO meta description (max 160 chars) for this government job announcement:
Title: ${title}
Organization: ${organization || 'Government of India'}
Content: ${content.slice(0, 500)}...

Return ONLY the meta description, no quotes or explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.5,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json() as any;
    const description = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      content: description.slice(0, 160),
      tokens: data.usage?.total_tokens,
    };
  } catch (error) {
    console.error('[AI] Meta description generation failed:', error);
    const fallback = content.split('.')[0]?.slice(0, 160) || title;
    return { content: fallback };
  }
}

/**
 * Generate SEO meta title from announcement content
 */
export async function generateMetaTitle(
  title: string,
  type?: string
): Promise<AIResponse> {
  if (!AI_CONFIG.apiKey) {
    return { content: title.slice(0, 60) };
  }

  try {
    const prompt = `Create a concise SEO title (max 60 chars) for this government job:
Original: ${title}
Type: ${type || 'Job'}

Return ONLY the title, optimized for search engines.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.5,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json() as any;
    const metaTitle = data.choices?.[0]?.message?.content?.trim() || title;

    return {
      content: metaTitle.slice(0, 60),
      tokens: data.usage?.total_tokens,
    };
  } catch (error) {
    console.error('[AI] Meta title generation failed:', error);
    return { content: title.slice(0, 60) };
  }
}

/**
 * Suggest relevant tags based on announcement content
 */
export async function suggestTags(
  title: string,
  content: string,
  organization?: string,
  existingTags: string[] = []
): Promise<TagSuggestion[]> {
  const commonTags = [
    'UPSC', 'SSC', 'Banking', 'Railway', 'Defense', 'Teaching', 'Police',
    'State Govt', 'Central Govt', 'PSU', 'Engineering', 'Medical',
    'Clerk', 'Officer', 'Manager', 'Technical', 'Non-Technical',
    'Graduate', 'Post Graduate', '12th Pass', '10th Pass',
    'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
    'Freshers', 'Experienced', 'Contract', 'Permanent'
  ];

  if (!AI_CONFIG.apiKey) {
    // Fallback: keyword matching
    const text = `${title} ${content}`.toLowerCase();
    const matches = commonTags
      .filter(tag => text.includes(tag.toLowerCase()))
      .map(tag => ({ tag, confidence: 0.7 }));
    return matches.slice(0, 5);
  }

  try {
    const prompt = `Suggest 3-5 relevant tags for this government job announcement from this list: ${commonTags.join(', ')}

Title: ${title}
Organization: ${organization || 'Government'}
Content: ${content.slice(0, 300)}...

Return ONLY a comma-separated list of tags from the provided list.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json() as any;
    const tagText = data.choices?.[0]?.message?.content?.trim() || '';
    const suggested = tagText.split(',').map(t => t.trim()).filter(Boolean);

    return suggested
      .filter(tag => !existingTags.includes(tag))
      .slice(0, 5)
      .map(tag => ({ tag, confidence: 0.9 }));
  } catch (error) {
    console.error('[AI] Tag suggestion failed:', error);
    // Fallback
    const text = `${title} ${content}`.toLowerCase();
    return commonTags
      .filter(tag => text.includes(tag.toLowerCase()))
      .slice(0, 5)
      .map(tag => ({ tag, confidence: 0.6 }));
  }
}

/**
 * Generate social media summary for Twitter/Telegram
 */
export async function generateSocialSummary(
  title: string,
  content: string,
  deadline?: string
): Promise<AIResponse> {
  if (!AI_CONFIG.apiKey) {
    const fallback = `${title}${deadline ? ` | Apply by: ${deadline}` : ''}`.slice(0, 280);
    return { content: fallback };
  }

  try {
    const prompt = `Create a concise social media post (max 280 chars) for this government job:
Title: ${title}
Deadline: ${deadline || 'Soon'}
Key details: ${content.slice(0, 200)}...

Make it engaging with emojis. Include #SarkariNaukri #GovernmentJobs hashtags.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const data = await response.json() as any;
    const summary = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      content: summary.slice(0, 280),
      tokens: data.usage?.total_tokens,
    };
  } catch (error) {
    console.error('[AI] Social summary generation failed:', error);
    const fallback = `${title}${deadline ? ` | Apply by: ${deadline}` : ''}`.slice(0, 280);
    return { content: fallback };
  }
}

/**
 * Simple keyword extraction for fallback
 */
export function extractKeywords(text: string): string[] {
  const keywords = [
    'UPSC', 'SSC', 'Bank', 'Railway', 'DRDO', 'ISRO', 'Police', 'Army',
    'Navy', 'Air Force', 'Teacher', 'Professor', 'Engineer', 'Doctor',
    'Nurse', 'Clerk', 'Stenographer', 'Constable', 'SI', 'IAS', 'IPS'
  ];
  const lowerText = text.toLowerCase();
  return keywords.filter(k => lowerText.includes(k.toLowerCase()));
}

export const aiService = {
  generateMetaDescription,
  generateMetaTitle,
  suggestTags,
  generateSocialSummary,
  extractKeywords,
};

export default aiService;
