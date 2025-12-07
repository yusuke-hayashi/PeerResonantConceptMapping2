import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ConceptMapEditor } from '../components/ConceptMapEditor';
import {
  getMap,
  createMap,
  updateMap,
  type MapNode,
  type MapLink,
} from '../services/firestore';

/**
 * Map editor page
 */
export function MapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [links, setLinks] = useState<MapLink[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function loadMap() {
      if (isNew || !id) return;

      try {
        setLoading(true);
        const loadedMap = await getMap(id);
        if (loadedMap) {
          setTitle(loadedMap.title);
          setNodes(loadedMap.nodes);
          setLinks(loadedMap.links);
        } else {
          setError('Map not found');
        }
      } catch (err) {
        console.error('Failed to load map:', err);
        setError('Failed to load map');
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [id, isNew]);

  const handleChange = useCallback((newNodes: MapNode[], newLinks: MapLink[]) => {
    setNodes(newNodes);
    setLinks(newLinks);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        const newMapId = await createMap(user.id, title || 'Untitled Map');
        await updateMap(newMapId, { title: title || 'Untitled Map', nodes, links });
        navigate(`/maps/${newMapId}`, { replace: true });
      } else if (id) {
        await updateMap(id, { title, nodes, links });
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to save map:', err);
      setError('Failed to save map');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/maps');
  };

  if (loading) {
    return (
      <div className="map-editor-page">
        <p>Loading map...</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="map-editor-page">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate('/maps')}>Back to Maps</button>
      </div>
    );
  }

  return (
    <div className="map-editor-page">
      <div className="editor-toolbar">
        <button className="back-button" onClick={handleBack}>
          &larr; Back
        </button>
        <input
          type="text"
          className="title-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasChanges(true);
          }}
          placeholder="Map title"
        />
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="editor-container">
        <ConceptMapEditor
          initialNodes={nodes}
          initialLinks={links}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
