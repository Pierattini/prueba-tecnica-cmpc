import { useState } from 'react';

interface Props {
  title: string;
  imageUrl: string | null;
  size?: 'sm' | 'lg';
}

export function BookCover({ title, imageUrl, size = 'sm' }: Props) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    const initials = title
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
    return (
      <div className={`cover cover--${size} cover--placeholder`} aria-label={`Sin portada: ${title}`}>
        {initials}
      </div>
    );
  }

  return (
    <img
      className={`cover cover--${size}`}
      src={imageUrl}
      alt={`Portada de ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
