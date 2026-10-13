import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { useToast } from './Toast';

export default function DecisionForm({ idDemande, onDone }) {
  const [commentaire, setCommentaire] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const send = async (decision) => {
    if (decision === 'REFUSE' && !commentaire.trim()) return toast.error('Un commentaire est obligatoire pour un refus');
    setBusy(true);
    try {
      await api.post(`/demandes/${idDemande}/decision`, { decision, commentaire: commentaire.trim() || undefined });
      toast.success(decision === 'APPROUVE' ? 'Demande approuvée' : 'Demande refusée');
      onDone?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-grid">
      <label className="full">
        Commentaire <span className="muted">(obligatoire en cas de refus)</span>
        <textarea rows={3} maxLength={255} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
      </label>
      <div className="full actions">
        <button className="btn btn-success" disabled={busy} onClick={() => send('APPROUVE')}>✔ Approuver</button>
        <button className="btn btn-danger" disabled={busy} onClick={() => send('REFUSE')}>✖ Refuser</button>
      </div>
    </div>
  );
}
