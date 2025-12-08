/**
 * LLM Service for vocabulary adjustment
 * Connects to LM Studio at http://127.0.0.1:1234
 */

import type {
  MapNode,
  MapLink,
  NodeAdjustmentResult,
  LinkAdjustmentResult,
  NodeMatch,
  LinkMatch,
  ComparisonResult,
} from './firestore';

const LLM_ENDPOINT = 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = 'lmstudio-community/gemma-3-4b-it-GGUF';

interface LLMResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Call LM Studio API
 */
async function callLLM(prompt: string): Promise<string> {
  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that normalizes vocabulary in concept maps. Always respond with valid JSON only, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as LLMResponse;
  return data.choices[0]?.message?.content || '';
}

/**
 * Extract JSON from LLM response
 */
function extractJSON<T>(text: string): T {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }
  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Adjust vocabulary for nodes
 */
export async function adjustNodeLabels(
  nodes: MapNode[],
  referenceNodes?: MapNode[]
): Promise<NodeAdjustmentResult[]> {
  if (nodes.length === 0) {
    return [];
  }

  const labels = nodes.map(n => n.label);
  const referenceLabels = referenceNodes?.map(n => n.label) || [];

  const prompt = `
Normalize these concept map node labels to standard vocabulary.
${referenceLabels.length > 0 ? `Reference labels (preferred vocabulary): ${JSON.stringify(referenceLabels)}` : ''}

Labels to normalize: ${JSON.stringify(labels)}

For each label, provide:
1. The original label
2. A normalized/standardized version (use reference labels if similar meaning exists)
3. Confidence score (0-1)

Respond with JSON array only:
[{"original": "...", "adjusted": "...", "confidence": 0.9}, ...]
`;

  try {
    const response = await callLLM(prompt);
    const adjustments = extractJSON<{ original: string; adjusted: string; confidence: number }[]>(response);

    return nodes.map((node, index) => {
      const adjustment = adjustments.find(a => a.original === node.label) || adjustments[index];
      return {
        nodeId: node.id,
        originalLabel: node.label,
        adjustedLabel: adjustment?.adjusted || node.label,
        confidence: adjustment?.confidence || 1.0,
      };
    });
  } catch (error) {
    console.error('Failed to adjust node labels:', error);
    // Fallback: return unchanged labels
    return nodes.map(node => ({
      nodeId: node.id,
      originalLabel: node.label,
      adjustedLabel: node.label,
      confidence: 1.0,
    }));
  }
}

/**
 * Adjust vocabulary for links
 */
export async function adjustLinkRelationships(
  links: MapLink[],
  referenceLinks?: MapLink[]
): Promise<LinkAdjustmentResult[]> {
  if (links.length === 0) {
    return [];
  }

  const relationships = links.map(l => l.relationship);
  const referenceRelationships = referenceLinks?.map(l => l.relationship) || [];

  const prompt = `
Normalize these concept map link relationships to standard vocabulary.
${referenceRelationships.length > 0 ? `Reference relationships (preferred vocabulary): ${JSON.stringify(referenceRelationships)}` : ''}

Relationships to normalize: ${JSON.stringify(relationships)}

For each relationship, provide:
1. The original relationship
2. A normalized/standardized version
3. Confidence score (0-1)

Respond with JSON array only:
[{"original": "...", "adjusted": "...", "confidence": 0.9}, ...]
`;

  try {
    const response = await callLLM(prompt);
    const adjustments = extractJSON<{ original: string; adjusted: string; confidence: number }[]>(response);

    return links.map((link, index) => {
      const adjustment = adjustments.find(a => a.original === link.relationship) || adjustments[index];
      return {
        linkId: link.id,
        originalRelationship: link.relationship,
        adjustedRelationship: adjustment?.adjusted || link.relationship,
        confidence: adjustment?.confidence || 1.0,
      };
    });
  } catch (error) {
    console.error('Failed to adjust link relationships:', error);
    // Fallback: return unchanged relationships
    return links.map(link => ({
      linkId: link.id,
      originalRelationship: link.relationship,
      adjustedRelationship: link.relationship,
      confidence: 1.0,
    }));
  }
}

/**
 * Find matching nodes between two maps based on adjusted labels
 */
export async function findMatchingNodes(
  nodes1: MapNode[],
  nodes2: MapNode[],
  adjusted1: NodeAdjustmentResult[],
  adjusted2: NodeAdjustmentResult[]
): Promise<{ matches: NodeMatch[]; unique1: string[]; unique2: string[] }> {
  const matches: NodeMatch[] = [];
  const matched1 = new Set<string>();
  const matched2 = new Set<string>();

  // Create lookup maps
  const adjustedMap1 = new Map(adjusted1.map(a => [a.nodeId, a]));
  const adjustedMap2 = new Map(adjusted2.map(a => [a.nodeId, a]));

  // Find matches based on adjusted labels
  for (const node1 of nodes1) {
    const adj1 = adjustedMap1.get(node1.id);
    if (!adj1) continue;

    for (const node2 of nodes2) {
      if (matched2.has(node2.id)) continue;

      const adj2 = adjustedMap2.get(node2.id);
      if (!adj2) continue;

      // Check if adjusted labels match (case-insensitive)
      if (adj1.adjustedLabel.toLowerCase() === adj2.adjustedLabel.toLowerCase()) {
        matches.push({
          node1Id: node1.id,
          node2Id: node2.id,
          originalLabel1: adj1.originalLabel,
          originalLabel2: adj2.originalLabel,
          adjustedLabel: adj1.adjustedLabel,
          similarity: Math.min(adj1.confidence, adj2.confidence),
        });
        matched1.add(node1.id);
        matched2.add(node2.id);
        break;
      }
    }
  }

  // Find unique nodes
  const unique1 = nodes1.filter(n => !matched1.has(n.id)).map(n => n.id);
  const unique2 = nodes2.filter(n => !matched2.has(n.id)).map(n => n.id);

  return { matches, unique1, unique2 };
}

/**
 * Find matching links between two maps based on adjusted relationships
 */
export async function findMatchingLinks(
  links1: MapLink[],
  links2: MapLink[],
  adjusted1: LinkAdjustmentResult[],
  adjusted2: LinkAdjustmentResult[],
  nodeMatches: NodeMatch[]
): Promise<{ matches: LinkMatch[]; unique1: string[]; unique2: string[] }> {
  const matches: LinkMatch[] = [];
  const matched1 = new Set<string>();
  const matched2 = new Set<string>();

  // Create node mapping from map1 to map2
  const nodeMap1To2 = new Map<string, string>();
  for (const match of nodeMatches) {
    nodeMap1To2.set(match.node1Id, match.node2Id);
  }

  // Create lookup maps
  const adjustedMap1 = new Map(adjusted1.map(a => [a.linkId, a]));
  const adjustedMap2 = new Map(adjusted2.map(a => [a.linkId, a]));

  // Find matches based on adjusted relationships and connected nodes
  for (const link1 of links1) {
    const adj1 = adjustedMap1.get(link1.id);
    if (!adj1) continue;

    // Get corresponding nodes in map2
    const targetSource2 = nodeMap1To2.get(link1.sourceNodeId);
    const targetTarget2 = nodeMap1To2.get(link1.targetNodeId);

    if (!targetSource2 || !targetTarget2) continue;

    for (const link2 of links2) {
      if (matched2.has(link2.id)) continue;

      const adj2 = adjustedMap2.get(link2.id);
      if (!adj2) continue;

      // Check if links connect the same (matched) nodes and have similar relationships
      const nodesMatch =
        (link2.sourceNodeId === targetSource2 && link2.targetNodeId === targetTarget2) ||
        (link2.sourceNodeId === targetTarget2 && link2.targetNodeId === targetSource2);

      const relationshipMatch =
        adj1.adjustedRelationship.toLowerCase() === adj2.adjustedRelationship.toLowerCase();

      if (nodesMatch && relationshipMatch) {
        matches.push({
          link1Id: link1.id,
          link2Id: link2.id,
          originalRelationship1: adj1.originalRelationship,
          originalRelationship2: adj2.originalRelationship,
          adjustedRelationship: adj1.adjustedRelationship,
          similarity: Math.min(adj1.confidence, adj2.confidence),
        });
        matched1.add(link1.id);
        matched2.add(link2.id);
        break;
      }
    }
  }

  // Find unique links
  const unique1 = links1.filter(l => !matched1.has(l.id)).map(l => l.id);
  const unique2 = links2.filter(l => !matched2.has(l.id)).map(l => l.id);

  return { matches, unique1, unique2 };
}

/**
 * Calculate similarity score between two maps
 */
function calculateSimilarityScore(
  matchedNodes: NodeMatch[],
  matchedLinks: LinkMatch[],
  totalNodes1: number,
  totalNodes2: number,
  totalLinks1: number,
  totalLinks2: number
): number {
  const totalElements = totalNodes1 + totalNodes2 + totalLinks1 + totalLinks2;
  if (totalElements === 0) return 1.0;

  const matchedElements = matchedNodes.length * 2 + matchedLinks.length * 2;
  return matchedElements / totalElements;
}

/**
 * Compare two concept maps with vocabulary adjustment
 */
export async function compareMaps(
  map1Nodes: MapNode[],
  map1Links: MapLink[],
  map2Nodes: MapNode[],
  map2Links: MapLink[],
  map1Id: string,
  map2Id: string,
  referenceNodes?: MapNode[],
  referenceLinks?: MapLink[]
): Promise<ComparisonResult> {
  // Adjust vocabulary for both maps
  const [adjustedNodes1, adjustedNodes2, adjustedLinks1, adjustedLinks2] = await Promise.all([
    adjustNodeLabels(map1Nodes, referenceNodes),
    adjustNodeLabels(map2Nodes, referenceNodes),
    adjustLinkRelationships(map1Links, referenceLinks),
    adjustLinkRelationships(map2Links, referenceLinks),
  ]);

  // Find matching elements
  const nodeResult = await findMatchingNodes(map1Nodes, map2Nodes, adjustedNodes1, adjustedNodes2);
  const linkResult = await findMatchingLinks(
    map1Links,
    map2Links,
    adjustedLinks1,
    adjustedLinks2,
    nodeResult.matches
  );

  // Calculate similarity score
  const similarityScore = calculateSimilarityScore(
    nodeResult.matches,
    linkResult.matches,
    map1Nodes.length,
    map2Nodes.length,
    map1Links.length,
    map2Links.length
  );

  return {
    map1Id,
    map2Id,
    similarityScore,
    matchedNodes: nodeResult.matches,
    matchedLinks: linkResult.matches,
    uniqueNodesMap1: nodeResult.unique1,
    uniqueNodesMap2: nodeResult.unique2,
    uniqueLinksMap1: linkResult.unique1,
    uniqueLinksMap2: linkResult.unique2,
    adjustedNodes1,
    adjustedNodes2,
    adjustedLinks1,
    adjustedLinks2,
  };
}

/**
 * Check if LLM service is available
 */
export async function checkLLMAvailability(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:1234/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
