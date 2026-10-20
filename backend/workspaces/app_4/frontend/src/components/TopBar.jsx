// Fine barre de chargement en haut de l'écran à chaque changement de page
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return visible ? <div className="top-bar" key={location.pathname} /> : null;
}
