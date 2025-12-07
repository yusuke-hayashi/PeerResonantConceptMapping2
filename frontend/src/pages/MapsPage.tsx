import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMaps, deleteMap, type ConceptMap } from '../services/firestore';

/**
 * Maps list page
 */
export function MapsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [maps, setMaps] = useState<ConceptMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMaps() {
      if (!user) return;

      try {
        setLoading(true);
        const userMaps = await getUserMaps(user.id);
        setMaps(userMaps);
      } catch (err) {
        console.error('Failed to load maps:', err);
        setError('Failed to load maps');
      } finally {
        setLoading(false);
      }
    }

    loadMaps();
  }, [user]);

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

  return (
    <div className="maps-page">
      <div className="maps-header">
        <h2>My Concept Maps</h2>
        <button
          className="create-button"
          onClick={() => navigate('/maps/new')}
        >
          + New Map
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {maps.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any concept maps yet.</p>
          <p>Click "New Map" to create your first one!</p>
        </div>
      ) : (
        <div className="maps-grid">
          {maps.map((map) => (
            <div key={map.id} className="map-card">
              <Link to={`/maps/${map.id}`} className="map-card-link">
                <h3>{map.title || 'Untitled Map'}</h3>
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
