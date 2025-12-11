import type { Node, Link } from '@peer-resonant/shared';

/**
 * LLM adapter error codes
 */
export const LLMErrorCode = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type LLMErrorCode = (typeof LLMErrorCode)[keyof typeof LLMErrorCode];

/**
 * LLM adapter error
 */
export class LLMError extends Error {
  constructor(
    public readonly code: LLMErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Vocabulary adjustment result
 */
export interface VocabularyAdjustmentResult {
  originalLabel: string;
  adjustedLabel: string;
  confidence: number;
}

/**
 * Node adjustment result
 */
export interface NodeAdjustmentResult {
  nodeId: string;
  originalLabel: string;
  adjustedLabel: string;
  confidence: number;
}

/**
 * Link adjustment result
 */
export interface LinkAdjustmentResult {
  linkId: string;
  originalRelationship: string;
  adjustedRelationship: string;
  confidence: number;
}

/**
 * Map adjustment result
 */
export interface MapAdjustmentResult {
  nodes: NodeAdjustmentResult[];
  links: LinkAdjustmentResult[];
}

/**
 * LLM adapter interface
 */
export interface LLMAdapter {
  /**
   * Adjust vocabulary for a single label
   */
  adjustLabel(label: string, context?: string): Promise<VocabularyAdjustmentResult>;

  /**
   * Adjust vocabulary for all nodes and links in a map
   * Property 13: Non-destructive vocabulary adjustment
   */
  adjustMapVocabulary(
    nodes: Node[],
    links: Link[],
    referenceNodes?: Node[],
    referenceLinks?: Link[]
  ): Promise<MapAdjustmentResult>;

  /**
   * Check if the LLM service is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * LLM adapter configuration
 */
export interface LLMAdapterConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

/**
 * Default configuration for LM Studio
 */
export const DEFAULT_LLM_CONFIG: LLMAdapterConfig = {
  baseUrl: 'http://127.0.0.1:1234',
  model: 'local-model',
  timeout: 30000,
  maxRetries: 3,
};

/**
 * OpenAI-compatible chat completion response
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

/**
 * Create LLM adapter for LM Studio (OpenAI-compatible API)
 */
export function createLLMAdapter(config: LLMAdapterConfig = DEFAULT_LLM_CONFIG): LLMAdapter {
  async function callLLM(
    systemPrompt: string,
    userPrompt: string,
    retryCount = 0
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new LLMError(LLMErrorCode.RATE_LIMITED, 'Rate limited by LLM service');
        }
        throw new LLMError(
          LLMErrorCode.CONNECTION_FAILED,
          `LLM service returned ${response.status}`,
          { status: response.status }
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new LLMError(LLMErrorCode.INVALID_RESPONSE, 'No choices in LLM response');
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LLMError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMError(LLMErrorCode.TIMEOUT, 'LLM request timed out', {
          timeout: config.timeout,
        });
      }

      // Retry on connection errors
      if (retryCount < config.maxRetries) {
        return callLLM(systemPrompt, userPrompt, retryCount + 1);
      }

      throw new LLMError(
        LLMErrorCode.CONNECTION_FAILED,
        `Failed to connect to LLM service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  function parseAdjustmentResponse(response: string): VocabularyAdjustmentResult[] {
    const results: VocabularyAdjustmentResult[] = [];
    const lines = response.trim().split('\n');

    for (const line of lines) {
      // Expected format: "original -> adjusted (confidence: 0.95)"
      const match = line.match(/^(.+?)\s*->\s*(.+?)\s*\(confidence:\s*([\d.]+)\)$/);
      if (match) {
        results.push({
          originalLabel: match[1].trim(),
          adjustedLabel: match[2].trim(),
          confidence: parseFloat(match[3]),
        });
      }
    }

    return results;
  }

  return {
    async adjustLabel(label: string, context?: string): Promise<VocabularyAdjustmentResult> {
      const systemPrompt = `You are a vocabulary standardization assistant for concept maps.
Your task is to normalize terminology while preserving the semantic meaning.
Return the result in the format: "original -> adjusted (confidence: X.XX)"
where X.XX is a confidence score between 0 and 1.
If no adjustment is needed, return the same label with confidence 1.00.`;

      const userPrompt = context
        ? `Standardize this label in the context of "${context}": "${label}"`
        : `Standardize this label: "${label}"`;

      const response = await callLLM(systemPrompt, userPrompt);
      const results = parseAdjustmentResponse(response);

      if (results.length === 0) {
        // If parsing fails, return the original with high confidence
        return {
          originalLabel: label,
          adjustedLabel: label,
          confidence: 0.9,
        };
      }

      return results[0];
    },

    async adjustMapVocabulary(
      nodes: Node[],
      links: Link[],
      referenceNodes?: Node[],
      referenceLinks?: Link[]
    ): Promise<MapAdjustmentResult> {
      // Build reference vocabulary grouped by type (noun/verb)
      let nounContext = '';
      let verbContext = '';
      if (referenceNodes && referenceNodes.length > 0) {
        const referenceNouns = referenceNodes.filter((n) => n.type === 'noun').map((n) => n.label);
        const referenceVerbs = referenceNodes.filter((n) => n.type === 'verb').map((n) => n.label);
        if (referenceNouns.length > 0) {
          nounContext = `Reference NOUN vocabulary: ${referenceNouns.join(', ')}`;
        }
        if (referenceVerbs.length > 0) {
          verbContext = `Reference VERB vocabulary: ${referenceVerbs.join(', ')}`;
        }
      }

      const systemPrompt = `You are a vocabulary standardization assistant for concept maps.
Your task is to normalize terminology to match a reference vocabulary while preserving semantic meaning.

IMPORTANT RULES:
1. NOUN nodes must ONLY be adjusted to other NOUNS from the reference vocabulary
2. VERB nodes must ONLY be adjusted to other VERBS from the reference vocabulary
3. NEVER convert a verb to a noun or a noun to a verb
4. If no matching term exists in the reference vocabulary, keep the original label

${nounContext}
${verbContext}

For each label/relationship, return a line in the format:
"original -> adjusted (confidence: X.XX)"
where X.XX is a confidence score between 0 and 1.`;

      // Build batch request for nodes with type information
      const nodeLabels = nodes.map((n) => `${n.type.toUpperCase()} "${n.id}": "${n.label}"`).join('\n');
      const linkRelationships = links.map((l) => `Link "${l.id}": "${l.relationship}"`).join('\n');

      const userPrompt = `Standardize the following concept map elements.
Remember: NOUNs can only match NOUNs, VERBs can only match VERBs.

NODES:
${nodeLabels}

LINKS:
${linkRelationships}`;

      const response = await callLLM(systemPrompt, userPrompt);
      const adjustments = parseAdjustmentResponse(response);

      // Build result maps
      const nodeAdjustments = new Map<string, VocabularyAdjustmentResult>();
      const linkAdjustments = new Map<string, VocabularyAdjustmentResult>();

      for (const adj of adjustments) {
        // Try to match with node IDs or link IDs from the original
        for (const node of nodes) {
          if (adj.originalLabel === node.label || adj.originalLabel.includes(node.id)) {
            nodeAdjustments.set(node.id, adj);
            break;
          }
        }
        for (const link of links) {
          if (adj.originalLabel === link.relationship || adj.originalLabel.includes(link.id)) {
            linkAdjustments.set(link.id, adj);
            break;
          }
        }
      }

      // Create result with all nodes and links, using original values where no adjustment was found
      const nodeResults: NodeAdjustmentResult[] = nodes.map((node) => {
        const adj = nodeAdjustments.get(node.id);
        return {
          nodeId: node.id,
          originalLabel: node.label,
          adjustedLabel: adj?.adjustedLabel ?? node.label,
          confidence: adj?.confidence ?? 1.0,
        };
      });

      const linkResults: LinkAdjustmentResult[] = links.map((link) => {
        const adj = linkAdjustments.get(link.id);
        return {
          linkId: link.id,
          originalRelationship: link.relationship,
          adjustedRelationship: adj?.adjustedLabel ?? link.relationship,
          confidence: adj?.confidence ?? 1.0,
        };
      });

      return {
        nodes: nodeResults,
        links: linkResults,
      };
    },

    async isAvailable(): Promise<boolean> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${config.baseUrl}/v1/models`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create a mock LLM adapter for testing
 * Property 13: Non-destructive vocabulary adjustment - preserves original labels
 */
export function createMockLLMAdapter(): LLMAdapter {
  // Use Map to avoid prototype pollution issues with "constructor" etc.
  const normalizations = new Map<string, string>([
    ['photosynthesis', 'photosynthesis'],
    ['photo synthesis', 'photosynthesis'],
    ['photo-synthesis', 'photosynthesis'],
    ['植物', '植物'],
    ['しょくぶつ', '植物'],
    ['animal', 'animal'],
    ['animals', 'animal'],
  ]);

  return {
    async adjustLabel(label: string, _context?: string): Promise<VocabularyAdjustmentResult> {
      const lowerLabel = label.toLowerCase();
      const adjustedLabel = normalizations.get(lowerLabel) ?? label;

      return {
        originalLabel: label,
        adjustedLabel,
        confidence: adjustedLabel === label ? 1.0 : 0.85,
      };
    },

    async adjustMapVocabulary(
      nodes: Node[],
      links: Link[],
      _referenceNodes?: Node[],
      _referenceLinks?: Link[]
    ): Promise<MapAdjustmentResult> {
      const nodeResults: NodeAdjustmentResult[] = nodes.map((node) => ({
        nodeId: node.id,
        originalLabel: node.label,
        adjustedLabel: node.label, // Mock: no adjustment
        confidence: 1.0,
      }));

      const linkResults: LinkAdjustmentResult[] = links.map((link) => ({
        linkId: link.id,
        originalRelationship: link.relationship,
        adjustedRelationship: link.relationship, // Mock: no adjustment
        confidence: 1.0,
      }));

      return {
        nodes: nodeResults,
        links: linkResults,
      };
    },

    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}
