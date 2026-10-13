import { useState } from 'react';
import TypesConges from './parametres/TypesConges';
import JoursFeries from './parametres/JoursFeries';
import Structure from './parametres/Structure';

const TABS = [
  { id: 'types', label: 'Types de congés', C: TypesConges },
  { id: 'feries', label: 'Jours fériés', C: JoursFeries },
  { id: 'structure', label: 'Organisation', C: Structure },
];

export default function Parametres() {
  const [tab, setTab] = useState('types');
  const { C } = TABS.find((t) => t.id === tab);
  return (
    <>
      <div className="page-head"><h1>Paramètres</h1></div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <C />
    </>
  );
}
