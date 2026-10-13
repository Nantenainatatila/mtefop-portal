import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import DecisionForm from '../components/DecisionForm';
import { ErrorBox, Loading } from '../components/State';
import { RH_ROLES } from '../utils/constants';
import { fmtDate, fmtDateTime, fmtNum, today } from '../utils/format';

const DEC_LABEL = { EN_ATTENTE: 'En attente', APPROUVE: 'Approuvé', REFUSE: 'Refusé' };
const NIVEAU_LABEL = { 1: 'Supérieur hiérarchique', 3: 'Ressources humaines' };

export default function DemandeDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: d, loading, error, reload } = useApi(() => api.get(`/demandes/${id}`), [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const isRH = hasRole(...RH_ROLES);
  const proprietaire = d.id_employe === user.id_employe;
  const courante = d.validations.find((v) => v.decision === 'EN_ATTENTE');
  const peutDecider =
    d.statut === 'EN_ATTENTE' && !proprietaire && courante &&
    (courante.id_valideur === user.id_employe || (courante.niveau === 3 && isRH));
  const annulable =
    (proprietaire || isRH) &&
    (d.statut === 'EN_ATTENTE' || (d.statut === 'APPROUVE' && (d.date_debut > today() || isRH)));

  const annuler = async () => {
    if (!window.confirm(`Annuler la demande ${d.reference} ?`)) return;
    try {
      await api.patch(`/demandes/${d.id_demande}/annuler`);
      toast.success('Demande annulée');
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <button className="link" onClick={() => navigate(-1)}>← Retour</button>
          <h1>Demande {d.reference} <StatusBadge statut={d.statut} /></h1>
        </div>
        <div className="actions">
          <button className="btn btn-light" onClick={() => window.print()}>🖨️ Imprimer</button>
          {annulable && <button className="btn btn-danger-light" onClick={annuler}>Annuler la demande</button>}
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Détails</h3>
          <dl className="details">
            <dt>Employé</dt><dd>{d.employe} <span className="muted">({d.matricule})</span></dd>
            <dt>Service</dt><dd>{d.service} · {d.direction}</dd>
            <dt>Type de congé</dt><dd>{d.type_conge}</dd>
            <dt>Période</dt><dd>{fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}</dd>
            <dt>Jours décomptés</dt><dd><b>{fmtNum(d.nb_jours)}</b></dd>
            {(d.demi_journee_debut || d.demi_journee_fin) ? (
              <><dt>Demi-journées</dt><dd>{d.demi_journee_debut ? 'Premier jour ' : ''}{d.demi_journee_fin ? 'Dernier jour' : ''}</dd></>
            ) : null}
            <dt>Motif</dt><dd>{d.motif || '—'}</dd>
            <dt>Adresse du congé</dt><dd>{d.adresse_conge || '—'}</dd>
            <dt>Justificatif</dt><dd>{d.justificatif || '—'}</dd>
            <dt>Intérimaire</dt><dd>{d.interim || '—'}</dd>
            <dt>Demandée le</dt><dd>{fmtDateTime(d.date_demande)}</dd>
          </dl>
        </section>

        <section className="card">
          <h3>Circuit de validation</h3>
          <ol className="timeline">
            {d.validations.map((v) => (
              <li key={v.niveau} className={`tl-${v.decision}`}>
                <div className="tl-dot" />
                <div>
                  <strong>{NIVEAU_LABEL[v.niveau] || `Niveau ${v.niveau}`}</strong>
                  <div>{v.valideur} — <span className={`badge badge-${v.decision === 'EN_ATTENTE' ? 'EN_ATTENTE' : v.decision}`}>{DEC_LABEL[v.decision]}</span></div>
                  {v.date_decision && <small className="muted">{fmtDateTime(v.date_decision)}</small>}
                  {v.commentaire && <p className="comment">« {v.commentaire} »</p>}
                </div>
              </li>
            ))}
          </ol>

          {peutDecider && (
            <div className="decision-box">
              <h4>Votre décision</h4>
              <DecisionForm idDemande={d.id_demande} onDone={reload} />
            </div>
          )}
        </section>
      </div>
      {!proprietaire && <Link to="/a-valider" className="muted">← Retour aux demandes à valider</Link>}
    </>
  );
}
