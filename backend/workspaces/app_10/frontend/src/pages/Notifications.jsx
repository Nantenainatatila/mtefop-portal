import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import { Empty, ErrorBox, Loading } from '../components/State';
import { fmtDateTime } from '../utils/format';

export default function Notifications() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.get('/notifications'), []);

  const ouvrir = async (n) => {
    if (!n.lu) await api.patch(`/notifications/${n.id_notification}/lu`).catch(() => {});
    if (n.lien) navigate(n.lien); else reload();
  };
  const toutLire = async () => { await api.patch('/notifications/lire-tout'); reload(); };

  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        <button className="btn btn-light" onClick={toutLire}>Tout marquer comme lu</button>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty>Aucune notification.</Empty> : (
        <ul className="notif-list">
          {data.map((n) => (
            <li key={n.id_notification} className={n.lu ? '' : 'unread'} onClick={() => ouvrir(n)}>
              <span>{n.message}</span>
              <small className="muted">{fmtDateTime(n.created_at)}</small>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
