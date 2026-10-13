import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ErrorBox, Loading } from '../components/State';
import { MANAGERS, RH_ROLES } from '../utils/constants';
import { fmtNum, nomComplet } from '../utils/format';

const INIT = {
  id_type: '', date_debut: '', date_fin: '', demi_journee_debut: false, demi_journee_fin: false,
  motif: '', adresse_conge: '', justificatif: '', id_interim: '', id_employe: '',
};

export default function NouvelleDemande() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState(INIT);
  const [busy, setBusy] = useState(false);
  const [solde, setSolde] = useState(null);

  const canList = hasRole(...MANAGERS);
  const isRH = hasRole(...RH_ROLES);

  const types = useApi(() => api.get('/types-conges'), []);
  const employes = useApi(() => (canList ? api.get('/employes', { params: { limit: 100 } }) : Promise.resolve({ data: { data: [] } })), [canList]);

  const type = types.data?.find((t) => String(t.id_type) === String(f.id_type));
  const annee = f.date_debut ? f.date_debut.slice(0, 4) : new Date().getFullYear();

  // Affiche le solde disponible pour le type choisi
  useEffect(() => {
    setSolde(null);
    if (!type || !type.decompte_solde) return;
    const url = isRH && f.id_employe ? `/soldes/employe/${f.id_employe}` : '/soldes/mes-soldes';
    api.get(url, { params: { annee } })
      .then((r) => setSolde(r.data.data.find((s) => s.id_type === type.id_type) || false))
      .catch(() => setSolde(null));
  }, [type?.id_type, annee, f.id_employe]); // eslint-disable-line

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== false));
    try {
      const { data } = await api.post('/demandes', payload);
      toast.success(`Demande ${data.data.reference} enregistrée (${fmtNum(data.data.nb_jours)} jour(s))`);
      navigate(`/demandes/${data.data.id_demande}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (types.loading) return <Loading />;
  if (types.error) return <ErrorBox message={types.error} />;

  return (
    <>
      <div className="page-head"><h1>Nouvelle demande de congé</h1></div>
      <form className="card form-grid" onSubmit={submit}>
        {isRH && (
          <label className="full">
            Pour le compte de <span className="muted">(laisser vide pour moi-même)</span>
            <select value={f.id_employe} onChange={set('id_employe')}>
              <option value="">— Moi-même —</option>
              {employes.data?.map((e) => <option key={e.id_employe} value={e.id_employe}>{e.matricule} · {nomComplet(e)}</option>)}
            </select>
          </label>
        )}

        <label className="full">
          Type de congé *
          <select required value={f.id_type} onChange={set('id_type')}>
            <option value="">— Choisir —</option>
            {types.data.map((t) => <option key={t.id_type} value={t.id_type}>{t.libelle}</option>)}
          </select>
        </label>

        {type && (
          <div className="full info-box">
            {type.decompte_solde ? (
              solde === null ? 'Chargement du solde…' :
              solde === false ? `⚠️ Aucun solde ouvert pour ${annee}. Contactez la DRH.` :
              <>Solde disponible ({annee}) : <b>{fmtNum(solde.reste)} jour(s)</b> sur {fmtNum(Number(solde.droit) + Number(solde.report))}</>
            ) : 'Ce type de congé n\'est pas décompté du solde annuel.'}
            {type.duree_max ? <> · Durée maximale : {type.duree_max} jours</> : null}
            {type.jours_ouvrables ? ' · Décompte en jours ouvrables' : ' · Décompte en jours calendaires'}
          </div>
        )}

        <label>Date de début *<input type="date" required value={f.date_debut} onChange={set('date_debut')} /></label>
        <label>Date de fin *<input type="date" required min={f.date_debut || undefined} value={f.date_fin} onChange={set('date_fin')} /></label>

        <label className="check"><input type="checkbox" checked={f.demi_journee_debut} onChange={set('demi_journee_debut')} /> Demi-journée le premier jour</label>
        <label className="check"><input type="checkbox" checked={f.demi_journee_fin} onChange={set('demi_journee_fin')} /> Demi-journée le dernier jour</label>

        {type?.justificatif_requis ? (
          <label className="full">
            Justificatif * <span className="muted">(n° du certificat, référence du document…)</span>
            <input required={!isRH} value={f.justificatif} onChange={set('justificatif')} maxLength={255} />
          </label>
        ) : null}

        <label className="full">Motif<input value={f.motif} onChange={set('motif')} maxLength={255} /></label>
        <label className="full">Adresse pendant le congé<input value={f.adresse_conge} onChange={set('adresse_conge')} maxLength={255} /></label>

        {canList && (
          <label className="full">
            Intérimaire <span className="muted">(facultatif)</span>
            <select value={f.id_interim} onChange={set('id_interim')}>
              <option value="">— Aucun —</option>
              {employes.data?.map((e) => <option key={e.id_employe} value={e.id_employe}>{nomComplet(e)} ({e.service})</option>)}
            </select>
          </label>
        )}

        <div className="full actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Soumettre la demande'}</button>
          <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </>
  );
}
