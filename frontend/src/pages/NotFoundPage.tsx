import { Link } from 'react-router-dom';

/**
 * 404 Not Found page
 */
export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>Page not found</p>
      <Link to="/" className="back-link">
        Back to Dashboard
      </Link>
    </div>
  );
}
