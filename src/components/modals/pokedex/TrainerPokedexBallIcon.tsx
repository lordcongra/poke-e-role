import { resolvePokeballUrl } from '../../../utils/graphics/pokeballConstants';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';

export interface TrainerPokedexBallIconProps {
    ball?: string;
    size?: number;
    className?: string;
}

export function TrainerPokedexBallIcon({ ball, size = 13, className }: TrainerPokedexBallIconProps) {
    const rawUrl = resolvePokeballUrl(ball);
    const resolvedUrl = useResolvedImageUrl(rawUrl);

    return (
        <img
            src={resolvedUrl}
            alt="Pokéball"
            style={{
                width: size,
                height: size,
                objectFit: 'contain',
                display: 'inline-block',
                verticalAlign: 'middle'
            }}
            className={className}
        />
    );
}
