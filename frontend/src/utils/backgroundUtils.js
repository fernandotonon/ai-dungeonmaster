export const backgroundImages = [
    '/background-images/greek.webp',
    '/background-images/japan.webp',
    '/background-images/magical.webp',
    '/background-images/mistery-forest.webp',
    '/background-images/oldwest.webp',
    '/background-images/pirate.webp',
    '/background-images/space.webp',
    '/background-images/steampunk.webp',
    '/background-images/underwater.webp',
  ];
  
  export const getRandomBackground = () => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  };