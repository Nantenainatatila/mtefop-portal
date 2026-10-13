import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ROLE_LABEL } from '../utils/constants';
import { fmtDateTime } from '../utils/format';

export default function Profil() {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmation: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (f.nouveau_mot_de_passe !== f.confirmation) return toast.error('Les mots de passe ne correspondent pas');
    setBusy(true);
    try {
      await api.put('/auth/mot-de-passe', { ancien_mot_de_passe: f.ancien_mot_de_passe, nouveau_mot_de_passe: f.nouveau_mot_de_passe });
      toast.success('Mot de passe modifié');
      setF({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmation: '' });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><h1>Mon profil</h1></div>
      <div className="grid-2">
        <section className="card">
          <h3>Informations</h3>
          <dl className="details">
            <dt>Nom</dt><dd>{user.nom} {user.prenom}</dd>
            <dt>Matricule</dt><dd>{user.matricule}</dd>
            <dt>Poste</dt><dd>{user.poste || '—'}</dd>
            <dt>Service</dt><dd>{user.service}</dd>
            <dt>Direction</dt><dd>{user.direction}</dd>
            <dt>Statut</dt><dd>{user.statut}</dd>
            <dt>Email</dt><dd>{user.email || '—'}</dd>
            <dt>Téléphone</dt><dd>{user.telephone || '—'}</dd>
            <dt>Identifiant</dt><dd>{user.login}</dd>
            <dt>Rôle</dt><dd>{ROLE_LABEL[user.role]}</dd>
            <dt>Dernière connexion</dt><dd>{fmtDateTime(user.derniere_connexion)}</dd>
          </dl>
        </section>

        <section className="card">
          <h3>Changer mon mot de passe</h3>
          <form className="form-grid" onSubmit={submit}>
            <label className="full">Ancien mot de passe<input type="password" required value={f.ancien_mot_de_passe} onChange={(e) => setF({ ...f, ancien_mot_de_passe: e.target.value })} autoComplete="current-password" /></label>
            <label className="full">Nouveau mot de passe <span className="muted">(8 caractères minimum)</span><input type="password" required minLength={8} value={f.nouveau_mot_de_passe} onChange={(e) => setF({ ...f, nouveau_mot_de_passe: e.target.value })} autoComplete="new-password" /></label>
            <label className="full">Confirmation<input type="password" required minLength={8} value={f.confirmation} onChange={(e) => setF({ ...f, confirmation: e.target.value })} autoComplete="new-password" /></label>
            <div className="full actions"><button className="btn btn-primary" disabled={busy}>Modifier</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
