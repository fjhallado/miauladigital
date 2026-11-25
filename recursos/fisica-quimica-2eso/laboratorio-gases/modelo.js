export const R = 8.314462618;
const referenceAmount = 100 * 4 / (R * 300);
export const bounds = {
 volume: { min: 1, max: 8, step: 0.1 },
 temperature: { min: 150, max: 600, step: 5 },
 amount: { min: 0, max: 160, step: 1 }
};

export const modes = {
 libre: {
  controls: ['volume', 'temperature', 'amount'],
  constant: 'Variables libres',
  introduction: 'Cambia una magnitud a la vez y observa el efecto sobre la presión.',
  formula: 'p · V = n · R · T',
  explanation: 'La presión absoluta se calcula con la ecuación del gas ideal.',
  challenge: 'Sin mover el pistón ni cambiar la temperatura, duplica la cantidad de gas. ¿Qué pasa con la presión?',
  pressure: 'Calculada',
  x: 'volume',
  y: 'pressure'
 },
 boyle: {
  controls: ['volume'],
  constant: 'T y n constantes',
  introduction: 'Comprime o expande el gas a 300 K con la misma cantidad de materia.',
  formula: 'p₁ · V₁ = p₂ · V₂',
  explanation: 'Al comprimir el gas, las partículas chocan más a menudo con las paredes y aumenta la presión.',
  challenge: 'Registra el estado inicial. Reduce el volumen de 4,00 L a 2,00 L y compara las presiones.',
  pressure: 'Calculada',
  x: 'volume',
  y: 'pressure'
 },
 charles: {
  controls: ['temperature'],
  constant: 'p y n constantes',
  introduction: 'Calienta el gas. El pistón se desplaza para mantener la presión en 100 kPa.',
  formula: 'V₁ / T₁ = V₂ / T₂',
  explanation: 'A presión constante, el volumen aumenta en la misma proporción que la temperatura absoluta.',
  challenge: 'Registra el volumen a 300 K y a 360 K. ¿En qué porcentaje aumenta?',
  pressure: 'Constante',
  x: 'temperature',
  y: 'volume'
 },
 gay: {
  controls: ['temperature'],
  constant: 'V y n constantes',
  introduction: 'Calienta el gas dentro de un recipiente rígido de 2,50 L.',
  formula: 'p₁ / T₁ = p₂ / T₂',
  explanation: 'En el mismo espacio, las partículas más rápidas transfieren más impulso a las paredes y la presión aumenta.',
  challenge: 'Compara la presión a 300 K y a 450 K sin cambiar el volumen.',
  pressure: 'Calculada',
  x: 'temperature',
  y: 'pressure'
 }
};

export function initialState(mode) {
 const thermal = mode === 'charles' || mode === 'gay';
 return { volume: thermal ? 2.5 : 4, temperature: 300, amount: thermal ? 50 : 80 };
}

export function setControl(state, mode, name, value) {
 if (!modes[mode].controls.includes(name) || !Number.isFinite(value)) return;
 const { min, max, step } = bounds[name];
 state[name] = Math.round(Math.min(max, Math.max(min, value)) / step) * step;
}

export function measure(state, mode) {
 const { temperature, amount } = state;
 const moles = amount / 80 * referenceAmount;
 const volume = mode === 'charles' ? moles * R * temperature / 100 : state.volume;
 return { volume, temperature, amount, moles, pressure: moles * R * temperature / volume };
}
