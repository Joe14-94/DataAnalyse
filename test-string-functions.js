/**
 * Script de test pour les nouvelles fonctions de manipulation de chaînes
 */

// Importer la fonction evaluateFormula depuis utils.ts
// Note: Ce fichier doit être exécuté avec ts-node ou après compilation

const testCases = [
  // CONCAT avec séparateur
  { formula: 'CONCAT([Prénom], [Nom], " ")', data: { Prénom: 'Jean', Nom: 'Dupont' }, expected: 'Jean Dupont', desc: 'CONCAT avec espace' },
  { formula: 'CONCAT([Ville], [Pays], ", ")', data: { Ville: 'Paris', Pays: 'France' }, expected: 'Paris, France', desc: 'CONCAT avec virgule-espace' },
  { formula: 'CONCAT([A], [B], [C])', data: { A: 'Hello', B: 'World', C: '!' }, expected: 'HelloWorld!', desc: 'CONCAT sans séparateur' },

  // REMPLACER
  { formula: 'REMPLACER([Texte], "ancien", "nouveau")', data: { Texte: 'ancien texte ancien' }, expected: 'nouveau texte nouveau', desc: 'REMPLACER simple' },
  { formula: 'REMPLACER([Email], "@.*", "@example.com")', data: { Email: 'user@domain.com' }, expected: 'user@example.com', desc: 'REMPLACER avec regex' },

  // SUBSTITUER
  { formula: 'SUBSTITUER([Texte], "old", "new")', data: { Texte: 'old text old' }, expected: 'new text new', desc: 'SUBSTITUER simple' },

  // EXTRAIRE
  { formula: 'EXTRAIRE([Texte], 0, 5)', data: { Texte: 'Hello World' }, expected: 'Hello', desc: 'EXTRAIRE 5 premiers caractères' },
  { formula: 'EXTRAIRE([Texte], 6)', data: { Texte: 'Hello World' }, expected: 'World', desc: 'EXTRAIRE à partir de la position 6' },

  // GAUCHE et DROITE
  { formula: 'GAUCHE([Texte], 3)', data: { Texte: 'Bonjour' }, expected: 'Bon', desc: 'GAUCHE 3 caractères' },
  { formula: 'DROITE([Texte], 4)', data: { Texte: 'Bonjour' }, expected: 'jour', desc: 'DROITE 4 caractères' },

  // LONGUEUR
  { formula: 'LONGUEUR([Texte])', data: { Texte: 'Hello' }, expected: 5, desc: 'LONGUEUR de "Hello"' },

  // TROUVE
  { formula: 'TROUVE("World", [Texte])', data: { Texte: 'Hello World' }, expected: 6, desc: 'TROUVE position de "World"' },
  { formula: 'TROUVE("xyz", [Texte])', data: { Texte: 'Hello World' }, expected: -1, desc: 'TROUVE texte non trouvé' },

  // CONTIENT
  { formula: 'CONTIENT([Texte], "World")', data: { Texte: 'Hello World' }, expected: true, desc: 'CONTIENT texte présent' },
  { formula: 'CONTIENT([Texte], "xyz")', data: { Texte: 'Hello World' }, expected: false, desc: 'CONTIENT texte absent' },

  // SUPPRESPACE
  { formula: 'SUPPRESPACE([Texte])', data: { Texte: '  Hello World  ' }, expected: 'Hello World', desc: 'SUPPRESPACE enlève espaces' },

  // CAPITALISEPREMIER
  { formula: 'CAPITALISEPREMIER([Texte])', data: { Texte: 'hello world' }, expected: 'Hello world', desc: 'CAPITALISEPREMIER' },

  // CAPITALISEMOTS
  { formula: 'CAPITALISEMOTS([Texte])', data: { Texte: 'hello world example' }, expected: 'Hello World Example', desc: 'CAPITALISEMOTS' },

  // Cas d'usage complexe : combiner plusieurs fonctions
  {
    formula: 'CONCAT(CAPITALISEMOTS([Prénom]), MAJUSCULE([Nom]), " ")',
    data: { Prénom: 'jean', Nom: 'dupont' },
    expected: 'Jean DUPONT',
    desc: 'Combinaison de fonctions'
  },

  // Cas d'usage : remplacements en chaîne
  {
    formula: 'REMPLACER(REMPLACER([Texte], "a", "o"), "e", "i")',
    data: { Texte: 'cette phrase' },
    expected: 'citti phrosi',
    desc: 'Remplacements multiples chaînés'
  },
];

console.log('=== Test des fonctions de manipulation de chaînes ===\n');

// Pour exécuter ces tests, vous devrez importer evaluateFormula
// et l'exécuter avec chaque test case
console.log('Tests définis:', testCases.length);
console.log('\nPour exécuter ces tests, utilisez la fonction evaluateFormula() avec chaque cas de test.\n');

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.desc}`);
  console.log(`  Formule: ${test.formula}`);
  console.log(`  Données: ${JSON.stringify(test.data)}`);
  console.log(`  Attendu: ${JSON.stringify(test.expected)}`);
  console.log('');
});

// Export pour utilisation dans les tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCases };
}
