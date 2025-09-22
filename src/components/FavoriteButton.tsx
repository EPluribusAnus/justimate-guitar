import clsx from 'clsx';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
}

const FavoriteButton = ({ isFavorite, onToggle }: Props) => {
  return (
    <button
      type="button"
      className={clsx('favorite-button', { 'favorite-button--active': isFavorite })}
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Unfavorite this transposition' : 'Favorite this transposition'}
    >
      ★
    </button>
  );
};

export default FavoriteButton;
