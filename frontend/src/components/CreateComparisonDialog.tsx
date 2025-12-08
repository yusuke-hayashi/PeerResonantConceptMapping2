import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  getMapsByTopic,
  createComparison,
  type Topic,
  type ConceptMap,
  type Comparison,
  type ComparisonMode,
} from '../services/firestore';
import {
  compareMaps,
  checkLLMAvailability,
} from '../services/llm-service';

interface CreateComparisonDialogProps {
  isOpen: boolean;
  topics: Topic[];
  onClose: () => void;
  onCreated: (comparison: Comparison) => void;
}

/**
 * Dialog for creating a new comparison
 */
export function CreateComparisonDialog({
  isOpen,
  topics,
  onClose,
  onCreated,
}: CreateComparisonDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Step management
  const [step, setStep] = useState<'mode' | 'topic' | 'maps'>('mode');

  // Selections
  const [selectedMode, setSelectedMode] = useState<ComparisonMode | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedReferenceMapId, setSelectedReferenceMapId] = useState('');
  const [selectedStudentMapIds, setSelectedStudentMapIds] = useState<string[]>([]);

  // Data
  const [maps, setMaps] = useState<ConceptMap[]>([]);
  const [llmAvailable, setLLMAvailable] = useState<boolean | null>(null);

  // Loading states
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check LLM availability on mount
  useEffect(() => {
    if (isOpen) {
      checkLLMAvailability().then(setLLMAvailable);
    }
  }, [isOpen]);

  // Load maps when topic is selected
  useEffect(() => {
    async function loadMaps() {
      if (!selectedTopicId) {
        setMaps([]);
        return;
      }

      try {
        setLoadingMaps(true);
        const topicMaps = await getMapsByTopic(selectedTopicId);
        setMaps(topicMaps);
      } catch (err) {
        console.error('Failed to load maps:', err);
        setError(t('errors.failedToLoad'));
      } finally {
        setLoadingMaps(false);
      }
    }

    loadMaps();
  }, [selectedTopicId, t]);

  // Filter maps by type
  const referenceMaps = maps.filter((m) => m.isReference);
  const studentMaps = maps.filter((m) => !m.isReference);

  const handleModeSelect = (mode: ComparisonMode) => {
    setSelectedMode(mode);
    setStep('topic');
  };

  const handleTopicSelect = () => {
    if (selectedTopicId) {
      setStep('maps');
    }
  };

  const handleStudentMapToggle = (mapId: string) => {
    setSelectedStudentMapIds((prev) =>
      prev.includes(mapId)
        ? prev.filter((id) => id !== mapId)
        : [...prev, mapId]
    );
  };

  const handleCreate = async () => {
    if (!user || !selectedMode || !selectedTopicId) return;

    // マップIDの収集
    let mapIds: string[] = [];
    switch (selectedMode) {
      case 'one_to_one':
        if (!selectedReferenceMapId || selectedStudentMapIds.length !== 1) return;
        mapIds = [selectedReferenceMapId, selectedStudentMapIds[0]];
        break;
      case 'teacher_to_all':
        if (!selectedReferenceMapId || studentMaps.length === 0) return;
        mapIds = [selectedReferenceMapId, ...studentMaps.map((m) => m.id)];
        break;
      case 'all_students':
        if (studentMaps.length < 2) return;
        mapIds = studentMaps.map((m) => m.id);
        break;
      case 'partial_students':
        if (selectedStudentMapIds.length < 2) return;
        mapIds = selectedStudentMapIds;
        break;
    }

    try {
      setCreating(true);
      setError(null);

      // LLMの可用性を再確認
      const isLLMAvailable = await checkLLMAvailability();
      if (!isLLMAvailable) {
        setError(t('comparisons.llmUnavailable'));
        return;
      }

      // マップのペアごとに比較を実行
      setProcessingStatus(t('comparisons.adjustingVocabulary'));

      // 対象マップを取得
      const targetMaps = maps.filter((m) => mapIds.includes(m.id));
      const referenceMap = selectedReferenceMapId
        ? maps.find((m) => m.id === selectedReferenceMapId)
        : undefined;

      // 比較結果を生成
      const results = [];
      const processedPairs = new Set<string>();

      for (let i = 0; i < targetMaps.length; i++) {
        for (let j = i + 1; j < targetMaps.length; j++) {
          const map1 = targetMaps[i];
          const map2 = targetMaps[j];
          const pairKey = [map1.id, map2.id].sort().join('-');

          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          setProcessingStatus(
            `${t('comparisons.comparing')} (${results.length + 1}/${Math.floor(
              (targetMaps.length * (targetMaps.length - 1)) / 2
            )})`
          );

          const result = await compareMaps(
            map1.nodes,
            map1.links,
            map2.nodes,
            map2.links,
            map1.id,
            map2.id,
            referenceMap?.nodes,
            referenceMap?.links
          );
          results.push(result);
        }
      }

      setProcessingStatus(t('comparisons.creatingComparison'));

      // Firestoreに保存
      const comparisonId = await createComparison(
        user.id,
        selectedMode,
        selectedTopicId,
        mapIds,
        results
      );

      // 作成されたComparisonオブジェクトを構築
      const newComparison: Comparison = {
        id: comparisonId,
        mode: selectedMode,
        topicId: selectedTopicId,
        mapIds,
        createdBy: user.id,
        results,
        createdAt: new Date(),
      };

      onCreated(newComparison);
      handleClose();
    } catch (err) {
      console.error('Failed to create comparison:', err);
      setError(err instanceof Error ? err.message : t('errors.failedToCreate'));
    } finally {
      setCreating(false);
      setProcessingStatus('');
    }
  };

  const handleClose = () => {
    setStep('mode');
    setSelectedMode(null);
    setSelectedTopicId('');
    setSelectedReferenceMapId('');
    setSelectedStudentMapIds([]);
    setMaps([]);
    setError(null);
    onClose();
  };

  const handleBack = () => {
    if (step === 'maps') {
      setStep('topic');
      setSelectedReferenceMapId('');
      setSelectedStudentMapIds([]);
    } else if (step === 'topic') {
      setStep('mode');
      setSelectedTopicId('');
    }
  };

  const canCreate = (): boolean => {
    if (!selectedMode || !selectedTopicId) return false;

    switch (selectedMode) {
      case 'one_to_one':
        return !!selectedReferenceMapId && selectedStudentMapIds.length === 1;
      case 'teacher_to_all':
        return !!selectedReferenceMapId && studentMaps.length > 0;
      case 'all_students':
        return studentMaps.length >= 2;
      case 'partial_students':
        return selectedStudentMapIds.length >= 2;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="create-comparison-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{t('comparisons.createComparison')}</h3>

        {llmAvailable === false && (
          <div className="warning-message">{t('comparisons.llmUnavailable')}</div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Step 1: Mode Selection */}
        {step === 'mode' && (
          <div className="mode-selection">
            <p>{t('comparisons.selectMode')}</p>
            <div className="mode-options">
              <button
                className="mode-option"
                onClick={() => handleModeSelect('one_to_one')}
              >
                <strong>{t('comparisons.oneToOne')}</strong>
                <span>{t('comparisons.oneToOneDesc')}</span>
              </button>
              <button
                className="mode-option"
                onClick={() => handleModeSelect('teacher_to_all')}
              >
                <strong>{t('comparisons.teacherToAll')}</strong>
                <span>{t('comparisons.teacherToAllDesc')}</span>
              </button>
              <button
                className="mode-option"
                onClick={() => handleModeSelect('all_students')}
              >
                <strong>{t('comparisons.allStudents')}</strong>
                <span>{t('comparisons.allStudentsDesc')}</span>
              </button>
              <button
                className="mode-option"
                onClick={() => handleModeSelect('partial_students')}
              >
                <strong>{t('comparisons.partialStudents')}</strong>
                <span>{t('comparisons.partialStudentsDesc')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Topic Selection */}
        {step === 'topic' && (
          <div className="topic-selection">
            <p>{t('comparisons.selectTopic')}</p>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            >
              <option value="">{t('comparisons.selectTopic')}...</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            <div className="dialog-actions">
              <button type="button" className="cancel-button" onClick={handleBack}>
                {t('common.back')}
              </button>
              <button
                type="button"
                className="add-button"
                disabled={!selectedTopicId}
                onClick={handleTopicSelect}
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Map Selection */}
        {step === 'maps' && (
          <div className="map-selection">
            {loadingMaps ? (
              <p>{t('common.loading')}</p>
            ) : (
              <>
                {/* Reference Map Selection */}
                {(selectedMode === 'one_to_one' || selectedMode === 'teacher_to_all') && (
                  <div className="reference-map-selection">
                    <p>{t('comparisons.selectReferenceMap')}</p>
                    {referenceMaps.length === 0 ? (
                      <p className="empty-notice">{t('comparisons.noReferenceMaps')}</p>
                    ) : (
                      <select
                        value={selectedReferenceMapId}
                        onChange={(e) => setSelectedReferenceMapId(e.target.value)}
                      >
                        <option value="">{t('comparisons.selectReferenceMap')}...</option>
                        {referenceMaps.map((map) => (
                          <option key={map.id} value={map.id}>
                            {map.title} ({map.nodes.length} nodes)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Student Map Selection */}
                {selectedMode === 'one_to_one' && (
                  <div className="student-map-selection">
                    <p>{t('comparisons.selectStudentMap')}</p>
                    {studentMaps.length === 0 ? (
                      <p className="empty-notice">{t('comparisons.noStudentMaps')}</p>
                    ) : (
                      <select
                        value={selectedStudentMapIds[0] || ''}
                        onChange={(e) =>
                          setSelectedStudentMapIds(e.target.value ? [e.target.value] : [])
                        }
                      >
                        <option value="">{t('comparisons.selectStudentMap')}...</option>
                        {studentMaps.map((map) => (
                          <option key={map.id} value={map.id}>
                            {map.title} ({map.nodes.length} nodes)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Multiple Student Map Selection */}
                {(selectedMode === 'partial_students') && (
                  <div className="student-maps-selection">
                    <p>{t('comparisons.selectStudentMaps')}</p>
                    {studentMaps.length === 0 ? (
                      <p className="empty-notice">{t('comparisons.noStudentMaps')}</p>
                    ) : (
                      <div className="map-checkboxes">
                        {studentMaps.map((map) => (
                          <label key={map.id} className="map-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedStudentMapIds.includes(map.id)}
                              onChange={() => handleStudentMapToggle(map.id)}
                            />
                            {map.title} ({map.nodes.length} nodes)
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All Students Info */}
                {(selectedMode === 'teacher_to_all' || selectedMode === 'all_students') && (
                  <div className="all-students-info">
                    <p>
                      {studentMaps.length} {t('comparisons.noStudentMaps').includes('No') ? 'student maps' : t('nav.maps')}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="dialog-actions">
              <button type="button" className="cancel-button" onClick={handleBack}>
                {t('common.back')}
              </button>
              <button
                type="button"
                className="add-button"
                disabled={!canCreate() || creating || llmAvailable === false}
                onClick={handleCreate}
              >
                {creating ? processingStatus || t('comparisons.creatingComparison') : t('common.create')}
              </button>
            </div>
          </div>
        )}

        {/* Cancel button at bottom for mode step */}
        {step === 'mode' && (
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
