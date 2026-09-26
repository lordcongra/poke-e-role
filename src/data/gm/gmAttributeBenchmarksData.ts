/**
 * Pokerole GM Screen - Strength (Lifting Capacity) & Dexterity (Speed) Benchmarks
 * Narrative guidelines from the Pokerole Corebook.
 */

export interface AttributeBenchmarkRow {
    score: number;
    dots: string;
    valueImperial: string;
    valueMetric: string;
}

export const STRENGTH_LIFTING_CHART: AttributeBenchmarkRow[] = [
    { score: 1, dots: '●○○○○○○○○○', valueImperial: '40 lb', valueMetric: '18 kg' },
    { score: 2, dots: '●●○○○○○○○○', valueImperial: '100 lb', valueMetric: '45 kg' },
    { score: 3, dots: '●●●○○○○○○○', valueImperial: '250 lb', valueMetric: '113 kg' },
    { score: 4, dots: '●●●●○○○○○○', valueImperial: '400 lb', valueMetric: '181 kg' },
    { score: 5, dots: '●●●●●○○○○○', valueImperial: '650 lb', valueMetric: '294 kg' },
    { score: 6, dots: '●●●●●●○○○○', valueImperial: '800 lb', valueMetric: '362 kg' },
    { score: 7, dots: '●●●●●●●○○○', valueImperial: '900 lb', valueMetric: '408 kg' },
    { score: 8, dots: '●●●●●●●●○○', valueImperial: '1000 lb', valueMetric: '453 kg' },
    { score: 9, dots: '●●●●●●●●●○', valueImperial: '1200 lb', valueMetric: '544 kg' },
    { score: 10, dots: '●●●●●●●●●●', valueImperial: '1500 lb', valueMetric: '680 kg' }
];

export const DEXTERITY_SPEED_CHART: AttributeBenchmarkRow[] = [
    { score: 1, dots: '●○○○○○○○○○', valueImperial: '6 mph', valueMetric: '10 km/h' },
    { score: 2, dots: '●●○○○○○○○○', valueImperial: '12 mph', valueMetric: '20 km/h' },
    { score: 3, dots: '●●●○○○○○○○', valueImperial: '15 mph', valueMetric: '25 km/h' },
    { score: 4, dots: '●●●●○○○○○○', valueImperial: '18 mph', valueMetric: '30 km/h' },
    { score: 5, dots: '●●●●●○○○○○', valueImperial: '24 mph', valueMetric: '40 km/h' },
    { score: 6, dots: '●●●●●●○○○○', valueImperial: '31 mph', valueMetric: '60 km/h' },
    { score: 7, dots: '●●●●●●●○○○', valueImperial: '49 mph', valueMetric: '80 km/h' },
    { score: 8, dots: '●●●●●●●●○○', valueImperial: '62 mph', valueMetric: '100 km/h' },
    { score: 9, dots: '●●●●●●●●●○', valueImperial: '80 mph', valueMetric: '130 km/h' },
    { score: 10, dots: '●●●●●●●●●●', valueImperial: '99 mph', valueMetric: '160 km/h' }
];

export const STRENGTH_RULES = [
    'Athletic Skill: Each point in your Athletic Skill adds 8 lb / 4 kg to your Lifting Capacity.',
    'Pain Penalties: Lifting Capacity is reduced by Pain Penalties.'
];

export const DEXTERITY_RULES = [
    'Athletic Skill: Each point in your Athletic Skill adds 1.4 mph / 2 km/h to your maximum speed.',
    'Pain Penalties: At Half HP you can only walk; at 1 HP remaining you can only crawl.',
    'Carrying Weight: Lifting someone or something halves your Speed, unless you can lift twice the weight of what you are carrying.'
];
