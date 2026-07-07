import { Info, Settings } from 'lucide-react';
import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__mark" aria-hidden="true">
          M
        </div>
        <div>
          <h1>Maestriss</h1>
          <p>Orchestrating Intelligence</p>
        </div>
      </div>
      <nav className="header__actions" aria-label="Application">
        <button className="header__action" type="button">
          <Settings size={16} aria-hidden="true" />
          <span>Settings</span>
        </button>
        <button className="header__action" type="button">
          <Info size={16} aria-hidden="true" />
          <span>About</span>
        </button>
      </nav>
    </header>
  );
}
