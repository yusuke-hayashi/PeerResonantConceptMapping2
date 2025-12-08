import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
        setError('Failed to load data');
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
    if (!confirm('Are you sure you want to delete this map?')) return;

    try {
      await deleteMap(mapId);
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
    } catch (err) {
      console.error('Failed to delete map:', err);
      setError('Failed to delete map');
    }
  };

  if (loading) {
    return (
      <div className="maps-page">
        <p>Loading maps...</p>
      </div>
    );
  }

  const handleCreateMap = () => {
    if (selectedTopicId) {
      navigate(`/maps/new?topicId=${selectedTopicId}`);
    } else {
      navigate('/maps/new');
    }
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
          {currentTopic ? `Maps: ${currentTopic.name}` : 'My Concept Maps'}
        </h2>
        <button className="create-button" onClick={handleCreateMap}>
          + New Map
        </button>
      </div>

      <div className="maps-filter">
        <label htmlFor="topic-filter">Filter by Topic:</label>
        <select
          id="topic-filter"
          value={selectedTopicId}
          onChange={handleTopicChange}
        >
          <option value="">All Topics</option>
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
          <p>No concept maps found.</p>
          <p>Click "New Map" to create one!</p>
        </div>
      ) : (
        <div className="maps-grid">
          {filteredMaps.map((map) => (
            <div key={map.id} className="map-card">
              <Link to={`/maps/${map.id}`} className="map-card-link">
                <h3>{map.title || 'Untitled Map'}</h3>
                <p className="map-topic">
                  {topicNameMap.get(map.topicId) || 'No Topic'}
                </p>
                <p className="map-meta">
                  {map.nodes.length} nodes, {map.links.length} links
                </p>
                <p className="map-date">
                  Updated: {map.updatedAt.toLocaleDateString()}
                </p>
              </Link>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(map.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
