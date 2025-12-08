import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromUrl = searchParams.get('topicId');
  const titleFromUrl = searchParams.get('title');
  const { user } = useAuth();
  const isNew = id === 'new';

  const [title, setTitle] = useState(titleFromUrl || '');
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
          setError(t('errors.mapNotFound'));
        }
      } catch (err) {
        console.error('Failed to load map:', err);
        setError(t('errors.failedToLoad'));
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [id, isNew, t]);

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

      const mapTitle = title || t('maps.untitledMap');
      if (isNew) {
        const newMapId = await createMap(user.id, mapTitle, topicIdFromUrl || 'default');
        await updateMap(newMapId, { title: mapTitle, nodes, links });
        navigate(`/maps/${newMapId}`, { replace: true });
      } else if (id) {
        await updateMap(id, { title, nodes, links });
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to save map:', err);
      setError(t('errors.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (!confirm(t('editor.unsavedChanges') || 'You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/maps');
  };

  if (loading) {
    return (
      <div className="map-editor-page">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="map-editor-page">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate('/maps')}>{t('common.back')}</button>
      </div>
    );
  }

  return (
    <div className="map-editor-page">
      <div className="editor-toolbar">
        <button className="back-button" onClick={handleBack}>
          &larr; {t('common.back')}
        </button>
        <input
          type="text"
          className="title-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasChanges(true);
          }}
          placeholder={t('maps.mapTitle')}
        />
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('editor.saving') : t('common.save')}
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
