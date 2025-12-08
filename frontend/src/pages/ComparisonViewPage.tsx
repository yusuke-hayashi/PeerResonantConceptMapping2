import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ComparisonMapView } from '../components/ComparisonMapView';
import { PermissionManager } from '../components/PermissionManager';
import {
  getComparison,
  getMapsByIds,
  type Comparison,
  type ConceptMap,
  type ComparisonResult,
} from '../services/firestore';

/**
 * Comparison view page - displays side-by-side comparison of concept maps
 */
export function ComparisonViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [maps, setMaps] = useState<Map<string, ConceptMap>>(new Map());
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);
        const loadedComparison = await getComparison(id);
        if (!loadedComparison) {
          setError(t('errors.notFound'));
          return;
        }
        setComparison(loadedComparison);

        // Load all referenced maps
        const loadedMaps = await getMapsByIds(loadedComparison.mapIds);
        const mapById = new Map(loadedMaps.map((m) => [m.id, m]));
        setMaps(mapById);
      } catch (err) {
        console.error('Failed to load comparison:', err);
        setError(t('errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, t]);

  const currentResult = useMemo((): ComparisonResult | null => {
    if (!comparison || comparison.results.length === 0) return null;
    return comparison.results[selectedResultIndex] || null;
  }, [comparison, selectedResultIndex]);

  const map1 = useMemo(() => {
    if (!currentResult) return null;
    return maps.get(currentResult.map1Id) || null;
  }, [currentResult, maps]);

  const map2 = useMemo(() => {
    if (!currentResult) return null;
    return maps.get(currentResult.map2Id) || null;
  }, [currentResult, maps]);

  const handleBack = () => {
    navigate('/comparisons');
  };

  if (loading) {
    return (
      <div className="comparison-view-page">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="comparison-view-page">
        <p className="error-message">{error || t('errors.notFound')}</p>
        <button onClick={handleBack}>{t('common.back')}</button>
      </div>
    );
  }

  const isOwner = user?.id === comparison.createdBy;

  return (
    <div className="comparison-view-page">
      <div className="comparison-header">
        <button className="back-button" onClick={handleBack}>
          &larr; {t('common.back')}
        </button>
        <h2>{t('comparisons.comparisonDetails')}</h2>
        {isOwner && (
          <button
            className="permission-button"
            onClick={() => setShowPermissions(!showPermissions)}
          >
            {t('comparisons.managePermissions')}
          </button>
        )}
      </div>

      {/* Result selector if multiple results */}
      {comparison.results.length > 1 && (
        <div className="result-selector">
          <label>{t('comparisons.selectMaps')}:</label>
          <select
            value={selectedResultIndex}
            onChange={(e) => setSelectedResultIndex(Number(e.target.value))}
          >
            {comparison.results.map((result, idx) => {
              const m1 = maps.get(result.map1Id);
              const m2 = maps.get(result.map2Id);
              return (
                <option key={idx} value={idx}>
                  {m1?.title || result.map1Id} vs {m2?.title || result.map2Id}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {currentResult && (
        <>
          {/* Similarity score */}
          <div className="similarity-score">
            <h3>{t('comparisons.similarityScore')}</h3>
            <div className="score-value">
              {(currentResult.similarityScore * 100).toFixed(1)}%
            </div>
          </div>

          {/* Statistics */}
          <div className="comparison-stats">
            <div className="stat-card">
              <span className="stat-label">{t('comparisons.matchedNodes')}</span>
              <span className="stat-value matched">
                {currentResult.matchedNodes.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('comparisons.matchedLinks')}</span>
              <span className="stat-value matched">
                {currentResult.matchedLinks.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('comparisons.uniqueNodes')} ({t('comparisons.map1')})</span>
              <span className="stat-value unique">
                {currentResult.uniqueNodesMap1.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('comparisons.uniqueNodes')} ({t('comparisons.map2')})</span>
              <span className="stat-value unique">
                {currentResult.uniqueNodesMap2.length}
              </span>
            </div>
          </div>

          {/* Side-by-side maps */}
          <div className="comparison-maps-container">
            <div className="map-panel">
              <h4>{map1?.title || t('comparisons.map1')}</h4>
              {map1 && (
                <ComparisonMapView
                  nodes={map1.nodes}
                  links={map1.links}
                  matchedNodeIds={currentResult.matchedNodes.map((m) => m.node1Id)}
                  matchedLinkIds={currentResult.matchedLinks.map((m) => m.link1Id)}
                  uniqueNodeIds={currentResult.uniqueNodesMap1}
                  uniqueLinkIds={currentResult.uniqueLinksMap1}
                  adjustedNodes={currentResult.adjustedNodes1}
                />
              )}
            </div>
            <div className="map-panel">
              <h4>{map2?.title || t('comparisons.map2')}</h4>
              {map2 && (
                <ComparisonMapView
                  nodes={map2.nodes}
                  links={map2.links}
                  matchedNodeIds={currentResult.matchedNodes.map((m) => m.node2Id)}
                  matchedLinkIds={currentResult.matchedLinks.map((m) => m.link2Id)}
                  uniqueNodeIds={currentResult.uniqueNodesMap2}
                  uniqueLinkIds={currentResult.uniqueLinksMap2}
                  adjustedNodes={currentResult.adjustedNodes2}
                />
              )}
            </div>
          </div>

          {/* Missing concepts from student (unique to teacher map) */}
          {currentResult.uniqueNodesMap1.length > 0 && (
            <div className="missing-concepts">
              <h3>{t('comparisons.missingConcepts')}</h3>
              <p className="missing-description">{t('comparisons.missingConceptsDesc')}</p>
              <ul className="missing-list">
                {currentResult.uniqueNodesMap1.map((nodeId) => {
                  const node = map1?.nodes.find((n) => n.id === nodeId);
                  const adjusted = currentResult.adjustedNodes1.find(
                    (a) => a.nodeId === nodeId
                  );
                  return (
                    <li key={nodeId} className="missing-item">
                      <span className={`node-type ${node?.type || 'noun'}`}>
                        {node?.type === 'verb' ? '動詞' : '名詞'}
                      </span>
                      {adjusted?.adjustedLabel || node?.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Missing propositions from student (unique links to teacher map) */}
          {currentResult.uniqueLinksMap1.length > 0 && (
            <div className="missing-propositions">
              <h3>{t('comparisons.missingPropositions')}</h3>
              <p className="missing-description">{t('comparisons.missingPropositionsDesc')}</p>
              <ul className="missing-list">
                {currentResult.uniqueLinksMap1.map((linkId) => {
                  const link = map1?.links.find((l) => l.id === linkId);
                  const sourceNode = map1?.nodes.find(
                    (n) => n.id === link?.sourceNodeId
                  );
                  const targetNode = map1?.nodes.find(
                    (n) => n.id === link?.targetNodeId
                  );
                  if (!sourceNode || !targetNode) return null;
                  return (
                    <li key={linkId} className="missing-item proposition">
                      <span className={`node-label ${sourceNode.type}`}>
                        {sourceNode.label}
                      </span>
                      <span className="arrow">→</span>
                      <span className={`node-label ${targetNode.type}`}>
                        {targetNode.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Vocabulary adjustments table */}
          <div className="vocabulary-adjustments">
            <h3>{t('comparisons.adjustedLabel')}</h3>
            <div className="adjustments-container">
              <div className="adjustment-column">
                <h4>{t('comparisons.map1')}</h4>
                <table className="adjustments-table">
                  <thead>
                    <tr>
                      <th>{t('comparisons.originalLabel')}</th>
                      <th>{t('comparisons.adjustedLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.adjustedNodes1
                      .filter((a) => a.originalLabel !== a.adjustedLabel)
                      .map((adj) => (
                        <tr key={adj.nodeId}>
                          <td>{adj.originalLabel}</td>
                          <td>{adj.adjustedLabel}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="adjustment-column">
                <h4>{t('comparisons.map2')}</h4>
                <table className="adjustments-table">
                  <thead>
                    <tr>
                      <th>{t('comparisons.originalLabel')}</th>
                      <th>{t('comparisons.adjustedLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.adjustedNodes2
                      .filter((a) => a.originalLabel !== a.adjustedLabel)
                      .map((adj) => (
                        <tr key={adj.nodeId}>
                          <td>{adj.originalLabel}</td>
                          <td>{adj.adjustedLabel}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Permission manager modal */}
      {showPermissions && (
        <PermissionManager
          comparisonId={comparison.id}
          onClose={() => setShowPermissions(false)}
        />
      )}
    </div>
  );
}
