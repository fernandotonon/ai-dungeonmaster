const backgroundImages = [
    '/background-images/greek.webp',
    '/background-images/japan.webp',
    '/background-images/magical.webp',
    '/background-images/mistery-forest.webp',
    '/background-images/oldwest.webp',
    '/background-images/pirate.webp',
    '/background-images/space.webp',
    '/background-images/steampunk.webp',
    '/background-images/underwater.webp',
    '/background-images/zombie.webp',
    '/background-images/aliens.webp',
    '/background-images/vampire.webp',
    '/background-images/werewolves.webp',
];

const kidsBackgroundImages = [
    '/background-images/kids/castel.webp',
    '/background-images/kids/dragon.webp',
    '/background-images/kids/magical.webp',
    '/background-images/kids/pirate.webp',
    '/background-images/kids/space.webp',
];

export const getRandomBackground = (kids) => {
    const randomIndex = Math.floor(Math.random() * (kids ? kidsBackgroundImages.length : backgroundImages.length));
    return `${process.env.PUBLIC_URL}${kids ? kidsBackgroundImages[randomIndex] : backgroundImages[randomIndex]}`;
};