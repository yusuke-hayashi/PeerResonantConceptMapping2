import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { CreateMapDialog } from '../components/CreateMapDialog';
import {
  getUserMaps,
  deleteMap,
  getTopics,
  getTopic,
  type ConceptMap,
  type Topic,
} from '../services/firestore';

/**
 * Maps list page
 */
export function MapsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromUrl = searchParams.get('topicId');

  const [maps, setMaps] = useState<ConceptMap[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topicIdFromUrl || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        const [userMaps, allTopics] = await Promise.all([
          getUserMaps(user.id),
          getTopics(),
        ]);
        setMaps(userMaps);
        setTopics(allTopics);

        // topicIdがURLにある場合はトピック情報を取得
        if (topicIdFromUrl) {
          const topic = await getTopic(topicIdFromUrl);
          setCurrentTopic(topic);
          setSelectedTopicId(topicIdFromUrl);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, topicIdFromUrl]);

  // フィルタリングされたマップ
  const filteredMaps = useMemo(() => {
    if (!selectedTopicId) return maps;
    return maps.filter((map) => map.topicId === selectedTopicId);
  }, [maps, selectedTopicId]);

  // トピックID -> トピック名のマッピング
  const topicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    topics.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [topics]);

  const handleDelete = async (mapId: string) => {
    if (!confirm(t('maps.deleteConfirm'))) return;

    try {
      await deleteMap(mapId);
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
    } catch (err) {
      console.error('Failed to delete map:', err);
      setError(t('errors.failedToDelete'));
    }
  };

  if (loading) {
    return (
      <div className="maps-page">
        <p>{t('maps.loadingMaps')}</p>
      </div>
    );
  }

  const handleCreateMap = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateMapConfirm = (topicId: string, title: string) => {
    setCreateDialogOpen(false);
    navigate(`/maps/new?topicId=${topicId}&title=${encodeURIComponent(title)}`);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopicId = e.target.value;
    setSelectedTopicId(newTopicId);
    if (newTopicId) {
      navigate(`/maps?topicId=${newTopicId}`);
    } else {
      navigate('/maps');
    }
  };

  return (
    <div className="maps-page">
      <div className="maps-header">
        <h2>
          {currentTopic ? t('maps.titleWithTopic', { topic: currentTopic.name }) : t('maps.title')}
        </h2>
        <button className="create-button" onClick={handleCreateMap}>
          + {t('maps.newMap')}
        </button>
      </div>

      <div className="maps-filter">
        <label htmlFor="topic-filter">{t('maps.filterByTopic')}</label>
        <select
          id="topic-filter"
          value={selectedTopicId}
          onChange={handleTopicChange}
        >
          <option value="">{t('maps.allTopics')}</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-message">{error}</p>}

      {filteredMaps.length === 0 ? (
        <div className="empty-state">
          <p>{t('maps.noMaps')}</p>
          <p>{t('maps.createFirstMapHint')}</p>
        </div>
      ) : (
        <div className="maps-grid">
          {filteredMaps.map((map) => (
            <div key={map.id} className="map-card">
              <Link to={`/maps/${map.id}`} className="map-card-link">
                <h3>{map.title || t('maps.untitledMap')}</h3>
                <p className="map-topic">
                  {topicNameMap.get(map.topicId) || t('maps.noTopic')}
                </p>
                <p className="map-meta">
                  {map.nodes.length} {t('maps.nodes')}, {map.links.length} {t('maps.links')}
                </p>
                <p className="map-date">
                  {t('maps.updated')}: {map.updatedAt.toLocaleDateString()}
                </p>
              </Link>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(map.id);
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateMapDialog
        isOpen={createDialogOpen}
        topics={topics}
        defaultTopicId={selectedTopicId}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateMapConfirm}
      />
    </div>
  );
}
