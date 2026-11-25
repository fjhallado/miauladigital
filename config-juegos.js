window.AULA_JUEGOS = {
 impostorUrl: 'https://classroom-impostor.onrender.com/?v=3',
 bingoUrl: 'https://classroom-impostor.onrender.com/bingo.html?v=3'
};

for (const link of document.querySelectorAll('a[data-juego]')) {
 const address = window.AULA_JUEGOS[link.dataset.juego];
 if (address?.startsWith('https://')) link.href = address;
}
