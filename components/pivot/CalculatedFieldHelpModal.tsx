import React, { useState, useEffect } from 'react';
import { X, BookOpen, Code, Lightbulb, Zap, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CalculatedFieldHelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'functions' | 'regex' | 'examples' | 'advanced'>('functions');

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Documentation des Champs Calculés</h2>
                            <p className="text-sm text-slate-600 mt-1">Guide complet des fonctions et exemples d'utilisation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors" aria-label="Fermer" title="Fermer">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('functions')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'functions' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
                    >
                        <Code className="w-4 h-4 inline mr-2" />
                        Toutes les fonctions
                    </button>
                    <button
                        onClick={() => setActiveTab('regex')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'regex' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
                    >
                        <Zap className="w-4 h-4 inline mr-2" />
                        Regex & Remplacements
                    </button>
                    <button
                        onClick={() => setActiveTab('examples')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'examples' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
                    >
                        <Lightbulb className="w-4 h-4 inline mr-2" />
                        Exemples pratiques
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'advanced' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
                    >
                        <Info className="w-4 h-4 inline mr-2" />
                        Cas d'usage avancés
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                    {activeTab === 'functions' && <FunctionsTab />}
                    {activeTab === 'regex' && <RegexTab />}
                    {activeTab === 'examples' && <ExamplesTab />}
                    {activeTab === 'advanced' && <AdvancedTab />}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
                    <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Tab Components
const FunctionsTab: React.FC = () => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">Logique & Math</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FunctionCard name="SI" syntax="SI(condition, vrai, faux)" desc="Retourne une valeur si la condition est vraie, sinon une autre" example='SI([Prix] > 100, "Cher", "Abordable")' />
                <FunctionCard name="SOMME" syntax="SOMME(v1, v2, ...)" desc="Additionne toutes les valeurs fournies" example="SOMME([Prix], [Taxes], [Frais])" />
                <FunctionCard name="MOYENNE" syntax="MOYENNE(v1, v2, ...)" desc="Calcule la moyenne des valeurs" example="MOYENNE([Note1], [Note2], [Note3])" />
                <FunctionCard name="ARRONDI" syntax="ARRONDI(nombre, décimales)" desc="Arrondit un nombre au nombre de décimales spécifié" example="ARRONDI([Prix], 2)" />
                <FunctionCard name="MIN" syntax="MIN(v1, v2, ...)" desc="Retourne la valeur minimale" example="MIN([Prix1], [Prix2], [Prix3])" />
                <FunctionCard name="MAX" syntax="MAX(v1, v2, ...)" desc="Retourne la valeur maximale" example="MAX([Vente1], [Vente2])" />
                <FunctionCard name="ABS" syntax="ABS(nombre)" desc="Retourne la valeur absolue d'un nombre" example="ABS([Différence])" />
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">Transformation de texte</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FunctionCard name="CONCAT" syntax="CONCAT(texte1, texte2, [sep])" desc="Concatène plusieurs textes avec un séparateur optionnel" example='CONCAT([Prénom], [Nom], " ")' />
                <FunctionCard name="MAJUSCULE" syntax="MAJUSCULE(texte)" desc="Convertit le texte en majuscules" example="MAJUSCULE([Nom])" />
                <FunctionCard name="MINUSCULE" syntax="MINUSCULE(texte)" desc="Convertit le texte en minuscules" example="MINUSCULE([Email])" />
                <FunctionCard name="CAPITALISEPREMIER" syntax="CAPITALISEPREMIER(texte)" desc="Met la première lettre en majuscule" example="CAPITALISEPREMIER([Prénom])" />
                <FunctionCard name="CAPITALISEMOTS" syntax="CAPITALISEMOTS(texte)" desc="Met la première lettre de chaque mot en majuscule" example="CAPITALISEMOTS([Titre])" />
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">Recherche & Remplacement</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FunctionCard name="REMPLACER" syntax="REMPLACER(texte, cherche, remplace)" desc="Remplace toutes les occurrences (supporte regex)" example='REMPLACER([Code], "[0-9]+", "")' />
                <FunctionCard name="SUBSTITUER" syntax="SUBSTITUER(texte, ancien, nouveau)" desc="Remplace du texte exact (sans regex)" example='SUBSTITUER([Statut], "En cours", "Active")' />
                <FunctionCard name="TROUVE" syntax="TROUVE(cherche, texte, [début])" desc="Trouve la position d'une sous-chaîne (-1 si absent)" example='TROUVE("@", [Email])' />
                <FunctionCard name="CONTIENT" syntax="CONTIENT(texte, cherche)" desc="Vérifie si le texte contient la sous-chaîne" example='CONTIENT([Email], "@gmail.com")' />
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm">Extraction</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FunctionCard name="EXTRAIRE" syntax="EXTRAIRE(texte, début, [longueur])" desc="Extrait une portion de texte" example="EXTRAIRE([Code], 3, 5)" />
                <FunctionCard name="GAUCHE" syntax="GAUCHE(texte, nb)" desc="Extrait les n premiers caractères" example="GAUCHE([Code], 3)" />
                <FunctionCard name="DROITE" syntax="DROITE(texte, nb)" desc="Extrait les n derniers caractères" example="DROITE([Année], 2)" />
                <FunctionCard name="LONGUEUR" syntax="LONGUEUR(texte)" desc="Retourne le nombre de caractères" example="LONGUEUR([Nom])" />
                <FunctionCard name="SUPPRESPACE" syntax="SUPPRESPACE(texte)" desc="Supprime les espaces de début et fin" example="SUPPRESPACE([Nom])" />
            </div>
        </div>
    </div>
);

const FunctionCard: React.FC<{ name: string; syntax: string; desc: string; example: string }> = ({ name, syntax, desc, example }) => (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all bg-slate-50">
        <div className="font-bold text-indigo-700 font-mono text-sm mb-2">{name}</div>
        <div className="text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mb-2">{syntax}</div>
        <div className="text-xs text-slate-600 mb-2">{desc}</div>
        <div className="text-xs">
            <span className="font-medium text-slate-500">Exemple : </span>
            <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">{example}</code>
        </div>
    </div>
);

const RegexTab: React.FC = () => (
    <div className="space-y-6">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-indigo-900 mb-2">🔍 Expressions régulières (Regex)</h3>
            <p className="text-sm text-slate-700">Les regex permettent de rechercher des patterns complexes dans du texte. Utilisez-les avec la fonction REMPLACER.</p>
        </div>

        <div>
            <h4 className="font-bold text-slate-800 mb-3">Patterns les plus utiles</h4>
            <div className="space-y-3">
                <RegexPattern pattern="[0-9]+" desc="Un ou plusieurs chiffres" example='REMPLACER([Code], "[0-9]+", "")' result="ABC123 → ABC" />
                <RegexPattern pattern="[a-z]+" desc="Une ou plusieurs lettres minuscules" example='REMPLACER([Texte], "[a-z]+", "X")' result="Hello123 → HX123" />
                <RegexPattern pattern="[A-Z]+" desc="Une ou plusieurs lettres majuscules" example='REMPLACER([Code], "[A-Z]+", "")' result="ABC123 → 123" />
                <RegexPattern pattern="[^a-zA-Z0-9 ]" desc="Tout SAUF lettres, chiffres et espaces" example='REMPLACER([Texte], "[^a-zA-Z0-9 ]", "")' result="Hello@World! → HelloWorld" />
                <RegexPattern pattern=" " desc="Espace" example='REMPLACER([Tel], " ", "")' result="06 12 34 → 0612 34" />
                <RegexPattern pattern="@.*" desc="@ suivi de n'importe quoi" example='REMPLACER([Email], "@.*", "@new.com")' result="user@old.com → user@new.com" />
                <RegexPattern pattern="[-_]" desc="Tiret ou underscore" example='REMPLACER([Code], "[-_]", " ")' result="hello-world_test → hello world test" />
                <RegexPattern pattern="\s+" desc="Un ou plusieurs espaces blancs" example='REMPLACER([Texte], "\s+", " ")' result="A  B   C → A B C" />
            </div>
        </div>

        <div>
            <h4 className="font-bold text-slate-800 mb-3">Tableau de référence Regex</h4>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">[0-9]</code>
                    <p className="text-xs text-slate-600 mt-1">Un chiffre de 0 à 9</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">[a-z]</code>
                    <p className="text-xs text-slate-600 mt-1">Une lettre minuscule</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">[A-Z]</code>
                    <p className="text-xs text-slate-600 mt-1">Une lettre majuscule</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">[^...]</code>
                    <p className="text-xs text-slate-600 mt-1">Tout SAUF ce qui est dans les crochets</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">+</code>
                    <p className="text-xs text-slate-600 mt-1">Un ou plusieurs</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">*</code>
                    <p className="text-xs text-slate-600 mt-1">Zéro ou plusieurs</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">.</code>
                    <p className="text-xs text-slate-600 mt-1">N'importe quel caractère</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <code className="font-mono text-indigo-700 font-bold">\s</code>
                    <p className="text-xs text-slate-600 mt-1">Espace blanc (espace, tab, etc.)</p>
                </div>
            </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-bold text-amber-900 mb-2">💡 Remplacements multiples</h4>
            <p className="text-sm text-slate-700 mb-3">Pour remplacer plusieurs chaînes différentes, imbriquez les fonctions REMPLACER :</p>
            <code className="block text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded p-3 whitespace-pre-wrap">
                REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Done"), "Annulé", "Cancelled")
            </code>
            <p className="text-xs text-slate-600 mt-2">Chaque REMPLACER s'exécute de l'intérieur vers l'extérieur.</p>
        </div>
    </div>
);

const RegexPattern: React.FC<{ pattern: string; desc: string; example: string; result: string }> = ({ pattern, desc, example, result }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
        <div className="flex items-start justify-between mb-2">
            <code className="font-mono text-purple-700 font-bold text-sm">{pattern}</code>
            <span className="text-xs text-slate-500">{desc}</span>
        </div>
        <div className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 mb-1">{example}</div>
        <div className="text-xs text-emerald-700 font-medium">→ {result}</div>
    </div>
);

const ExamplesTab: React.FC = () => (
    <div className="space-y-6">
        <ExampleSection
            title="Formater un nom complet"
            formula='CONCAT(CAPITALISEPREMIER([Prénom]), MAJUSCULE([Nom]), " ")'
            data={{ Prénom: 'jean', Nom: 'dupont' }}
            result="Jean DUPONT"
            explanation="Combine CONCAT avec CAPITALISEPREMIER et MAJUSCULE pour formater correctement un nom."
        />

        <ExampleSection
            title="Nettoyer un numéro de téléphone"
            formula='REMPLACER([Téléphone], " ", "")'
            data={{ Téléphone: '06 12 34 56 78' }}
            result="0612345678"
            explanation="Supprime tous les espaces d'un numéro de téléphone."
        />

        <ExampleSection
            title="Extraire uniquement les chiffres"
            formula='REMPLACER([Code], "[^0-9]", "")'
            data={{ Code: 'ABC-123-DEF' }}
            result="123"
            explanation="Garde uniquement les chiffres en supprimant tout le reste."
        />

        <ExampleSection
            title="Créer un email"
            formula='CONCAT(MINUSCULE([Prénom]), ".", MINUSCULE([Nom]), "@example.com")'
            data={{ Prénom: 'Jean', Nom: 'Dupont' }}
            result="jean.dupont@example.com"
            explanation="Génère automatiquement une adresse email à partir du nom et prénom."
        />

        <ExampleSection
            title="Normaliser des statuts"
            formula='REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Done"), "Annulé", "Cancelled")'
            data={{ Statut: 'En cours' }}
            result="Active"
            explanation="Traduit plusieurs statuts en imbriquant les REMPLACER."
        />

        <ExampleSection
            title="Vérifier et catégoriser"
            formula='SI(CONTIENT([Email], "@gmail.com"), "Gmail", "Autre")'
            data={{ Email: 'user@gmail.com' }}
            result="Gmail"
            explanation="Utilise CONTIENT dans une condition SI pour catégoriser."
        />

        <ExampleSection
            title="Extraire l'initiale"
            formula='MAJUSCULE(GAUCHE([Prénom], 1))'
            data={{ Prénom: 'jean' }}
            result="J"
            explanation="Extrait la première lettre et la met en majuscule."
        />

        <ExampleSection
            title="Formater un code postal"
            formula='GAUCHE([CodePostal], 2)'
            data={{ CodePostal: '75001' }}
            result="75"
            explanation="Extrait le département du code postal."
        />
    </div>
);

const ExampleSection: React.FC<{
    title: string;
    formula: string;
    data: Record<string, any>;
    result: string;
    explanation: string;
}> = ({ title, formula, data, result, explanation }) => (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-lg transition-all bg-gradient-to-br from-white to-slate-50">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">{title}</span>
        </h4>
        <div className="space-y-2">
            <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Formule :</span>
                <code className="block text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded p-2 whitespace-pre-wrap">{formula}</code>
            </div>
            <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Données :</span>
                <code className="block text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded p-2">{JSON.stringify(data)}</code>
            </div>
            <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Résultat :</span>
                <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">{result}</div>
            </div>
            <div className="text-xs text-slate-600 italic bg-blue-50 border border-blue-200 rounded p-2">
                💡 {explanation}
            </div>
        </div>
    </div>
);

const AdvancedTab: React.FC = () => (
    <div className="space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-purple-900 mb-2">🚀 Cas d'usage avancés</h3>
            <p className="text-sm text-slate-700">Exemples de formules complexes combinant plusieurs fonctions.</p>
        </div>

        <AdvancedExample
            title="Nettoyage complet de données"
            formula='SUPPRESPACE(MAJUSCULE(REMPLACER([Nom], "[^a-zA-Z ]", "")))'
            explanation="Supprime les caractères spéciaux, met en majuscules et nettoie les espaces."
            steps={[
                'REMPLACER supprime tous les caractères qui ne sont pas des lettres ou espaces',
                'MAJUSCULE convertit le résultat en majuscules',
                'SUPPRESPACE enlève les espaces en début/fin'
            ]}
        />

        <AdvancedExample
            title="Validation et formatage conditionnel"
            formula='SI(LONGUEUR([Code]) > 5, GAUCHE([Code], 5), CONCAT([Code], "0"))'
            explanation="Si le code a plus de 5 caractères, on le tronque, sinon on ajoute un 0."
            steps={[
                'LONGUEUR vérifie la taille du code',
                'Si > 5 : GAUCHE extrait les 5 premiers caractères',
                'Sinon : CONCAT ajoute un 0 à la fin'
            ]}
        />

        <AdvancedExample
            title="Construction d'identifiant unique"
            formula='CONCAT(MAJUSCULE(GAUCHE([Prénom], 1)), MAJUSCULE(GAUCHE([Nom], 3)), [ID], "-")'
            explanation="Crée un identifiant du format J-DUP-123."
            steps={[
                'GAUCHE extrait la première lettre du prénom',
                'GAUCHE extrait les 3 premières lettres du nom',
                'MAJUSCULE convertit en majuscules',
                'CONCAT assemble avec des tirets'
            ]}
        />

        <AdvancedExample
            title="Extraction de domaine email"
            formula='EXTRAIRE([Email], TROUVE("@", [Email]) + 1)'
            explanation="Extrait le domaine d'une adresse email (après le @)."
            steps={[
                'TROUVE localise la position du @',
                '+ 1 pour commencer après le @',
                'EXTRAIRE prend tout à partir de cette position'
            ]}
        />

        <AdvancedExample
            title="Masquage partiel de données"
            formula='CONCAT(GAUCHE([Tel], 2), " ** ** ** ", DROITE([Tel], 2))'
            explanation="Masque le milieu d'un numéro de téléphone : 06 ** ** ** 78."
            steps={[
                'GAUCHE garde les 2 premiers chiffres',
                'Ajoute des astérisques au milieu',
                'DROITE garde les 2 derniers chiffres'
            ]}
        />

        <AdvancedExample
            title="Normalisation multi-sources"
            formula='CAPITALISEPREMIER(SUPPRESPACE(SI(LONGUEUR([Pays]) = 2, [Pays], GAUCHE([Pays], 15))))'
            explanation="Normalise les noms de pays de différentes sources."
            steps={[
                'SI vérifie si c\'est un code pays (2 lettres)',
                'Sinon, limite à 15 caractères avec GAUCHE',
                'SUPPRESPACE nettoie les espaces',
                'CAPITALISEPREMIER formate correctement'
            ]}
        />

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-bold text-amber-900 mb-2">⚠️ Bonnes pratiques</h4>
            <ul className="text-sm text-slate-700 space-y-2">
                <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span><strong>Testez progressivement :</strong> Construisez votre formule étape par étape en vérifiant l'aperçu.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span><strong>Gérez les cas limites :</strong> Utilisez SI pour vérifier les valeurs nulles ou vides.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span><strong>Documentez vos formules :</strong> Utilisez des noms de champs explicites.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span><strong>Évitez la complexité inutile :</strong> Si possible, créez plusieurs champs intermédiaires plutôt qu'une seule formule géante.</span>
                </li>
            </ul>
        </div>
    </div>
);

const AdvancedExample: React.FC<{
    title: string;
    formula: string;
    explanation: string;
    steps: string[];
}> = ({ title, formula, explanation, steps }) => (
    <div className="border-l-4 border-purple-400 pl-4 py-3 bg-white rounded-r-lg">
        <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
        <code className="block text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded p-3 mb-3 whitespace-pre-wrap">{formula}</code>
        <p className="text-sm text-slate-700 mb-2">{explanation}</p>
        <div className="text-xs text-slate-600 space-y-1">
            <span className="font-medium block">Étapes :</span>
            {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 pl-2">
                    <span className="text-purple-600 font-bold">{i + 1}.</span>
                    <span>{step}</span>
                </div>
            ))}
        </div>
    </div>
);
