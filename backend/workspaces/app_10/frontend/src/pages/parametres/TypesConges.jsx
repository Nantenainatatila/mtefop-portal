import { useState } from 'react';
import api, { errMsg } from '../../api/client';
import useApi from '../../hooks/useApi';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { ErrorBox, Loading } from '../../components/State';
import { fmtNum } from '../../utils/format';

const VIDE = {
  code: '', libelle: '', jours_par_an: '', duree_max: '', decompte_solde: true, jours_ouvrables: true,
  justificatif_requis: false, sexe_requis: '', actif: true,
};

export default function TypesConges() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => api.get('/types-conges', { params: { tous: 1 } }), []);
  const [form, setForm] = useState(null);

  const open = (t) => setForm(t ? { ...t, jours_par_an: t.jours_par_an ?? '', duree_max: t.duree_max ?? '', sexe_requis: t.sexe_requis ?? '' } : { ...VIDE });

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      code: form.code, libelle: form.libelle,
      jours_par_an: form.jours_par_an === '' ? null : Number(form.jours_par_an),
      duree_max: form.duree_max === '' ? null : Number(form.duree_max),
      decompte_solde: form.decompte_solde ? 1 : 0,
      jours_ouvrables: form.jours_ouvrables ? 1 : 0,
      justificatif_requis: form.justificatif_requis ? 1 : 0,
      sexe_requis: form.sexe_requis || null,
      actif: form.actif ? 1 : 0,
    };
    try {
      if (form.id_type) await api.put(`/types-conges/${form.id_type}`, payload);
      else await api.post('/types-conges', payload);
      toast.success('Type de congé enregistré');
      setForm(null);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const chk = (k) => (e) => setForm({ ...form, [k]: e.target.checked });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  return (
    <>
      <div className="page-head"><span className="muted">Les règles ci-dessous s'appliquent automatiquement aux demandes.</span><button className="btn btn-primary" onClick={() => open(null)}>➕ Nouveau type</button></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Libellé</th><th>Droit annuel</th><th>Durée max</th><th>Décompté</th><th>Jours</th><th>Justif.</th><th>Sexe</th><th>Actif</th><th /></tr></thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id_type} className={t.actif ? '' : 'inactive'}>
                <td>{t.code}</td><td>{t.libelle}</td>
                <td>{t.jours_par_an != null ? `${fmtNum(t.jours_par_an)} j` : '—'}</td>
                <td>{t.duree_max ? `${t.duree_max} j` : '—'}</td>
                <td>{t.decompte_solde ? 'Oui' : 'Non'}</td>
                <td>{t.jours_ouvrables ? 'Ouvrables' : 'Calendaires'}</td>
                <td>{t.justificatif_requis ? 'Oui' : 'Non'}</td>
                <td>{t.sexe_requis || '—'}</td>
                <td>{t.actif ? '✔' : '✖'}</td>
                <td className="row-actions"><button className="btn btn-light" onClick={() => open(t)}>Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id_type ? 'Modifier le type' : 'Nouveau type de congé'} onClose={() => setForm(null)} wide>
          <form className="form-grid" onSubmit={save}>
            <label>Code *<input required value={form.code} onChange={set('code')} /></label>
            <label>Libellé *<input required value={form.libelle} onChange={set('libelle')} /></label>
            <label>Droit annuel (jours)<input type="number" step="0.5" min={0} value={form.jours_par_an} onChange={set('jours_par_an')} placeholder="Vide = pas de quota" /></label>
            <label>Durée maximale (jours)<input type="number" min={1} value={form.duree_max} onChange={set('duree_max')} placeholder="Vide = illimitée" /></label>
            <label>Réservé au sexe
              <select value={form.sexe_requis} onChange={set('sexe_requis')}><option value="">Tous</option><option value="F">Féminin</option><option value="M">Masculin</option></select>
            </label>
            <div />
            <label className="check"><input type="checkbox" checked={!!form.decompte_solde} onChange={chk('decompte_solde')} /> Décompté du solde annuel</label>
            <label className="check"><input type="checkbox" checked={!!form.jours_ouvrables} onChange={chk('jours_ouvrables')} /> Compté en jours ouvrables</label>
            <label className="check"><input type="checkbox" checked={!!form.justificatif_requis} onChange={chk('justificatif_requis')} /> Justificatif requis</label>
            <label className="check"><input type="checkbox" checked={!!form.actif} onChange={chk('actif')} /> Actif</label>
            <div className="full actions">
              <button className="btn btn-primary">Enregistrer</button>
              <button type="button" className="btn btn-light" onClick={() => setForm(null)}>Annuler</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
