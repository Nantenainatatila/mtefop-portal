// Image de profil. Sans image : un rond avec la première lettre du nom.
export default function Avatar({ src, name = '?', size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };

  if (src) {
    return <img className="avatar" src={src} alt={name} style={style} />;
  }
  return (
    <span className="avatar avatar-letter" style={style}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
