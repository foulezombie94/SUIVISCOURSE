# Programmes Élan

Recherche et implementation : 3 octobre 2026.

## Références consultées

- Nike Run Club, catalogue : https://www.nike.com/running/training-plans
- Nike, séances du 5 km : https://www.nike.com/running/5k-training-plan
- Nike, 10 km : https://www.nike.com/running/10k-training-plan
- Nike, semi : https://www.nike.com/running/half-marathon-training-plan
- Strava, nouveaux plans de course via Runna : https://support.strava.com/en-us/articles/15401942-training-plans-for-runners
- Runna, fonctionnalités et calendrier : https://www.runna.com/features
- Runna, principes de progression : https://www.runna.com/training/training-plans
- Runna, création et durées des plans : https://support.runna.com/en/articles/15443877-how-to-create-a-training-plan-in-runna
- Adidas Running : https://www.adidas.com/us/running-app
- NHS, Couch to 5K : https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/

## Choix d’interface

Catalogue par objectif, affiches colorées propres à Élan et typographie noire. Chaque programme expose durée, fréquence, niveau et prérequis avant sa sélection. Le suivi comporte un calendrier hebdomadaire, les jours de récupération, la prochaine séance et la progression. Une page dédiée détaille échauffement, blocs d’effort, récupération et retour au calme.

Les logos, illustrations et écrans des marques ne sont pas reproduits. Les références donnent des repères d’organisation, pas une validation des calendriers Élan.

## Contenu et fonctionnement

Quatre trames générales originales : débuter (9 semaines), 5 km (8), 10 km (10), semi (12). Trois séances par semaine, espacées de jours sans course. Les calendriers de distance alternent endurance facile, variations contrôlées et sortie longue, avec semaines allégées et diminution du volume avant l’objectif.

Les durées comprennent l’échauffement et le retour au calme. Pour les sorties mesurées en kilomètres, la distance affichée est celle du bloc principal ; l’échauffement et le retour au calme sont indiqués séparément. Les intensités sont données en sensations, sans inventer une allure personnalisée ni une fréquence cardiaque cible.

Ces plans ne sont pas des prescriptions individuelles ni des programmes certifiés par Nike, Runna ou Adidas. Les prérequis sont visibles avant la sélection. Le programme de début n’est pas une reproduction du calendrier NHS.

La sélection et les séances réalisées sont persistées sur l’appareil, séparément pour chaque compte, via AsyncStorage. Une séance peut être cochée manuellement après réalisation ou validée par le suivi guidé décrit ci-dessous. Un changement de programme demande confirmation car il remplace la progression locale précédente.

## Suivi guidé

Le lancement transporte l’identifiant exact de séance au compte à rebours puis au moteur GPS. Le déroulé est figé dans la sortie active : échauffement spécifique à la séance, répétitions de travail et récupération, retour au calme. Le suivi conserve un seul tracé et les mesures de chaque bloc. Après l’échauffement terminé, le coureur lance explicitement le bloc principal. Les blocs intermédiaires s’enchaînent selon leur durée ou distance mesurée. Le retour au calme terminé permet de sauvegarder et valider la séance ; un arrêt anticipé conserve la sortie sans valider les blocs restants.

Les compteurs utilisent le temps actif hors pauses. La reprise après fermeture restitue le même bloc et exclut la période de fermeture. Les étapes et leurs résultats sont sauvegardés avec la sortie sur le téléphone. Le titre et les mesures globales continuent à utiliser la synchronisation d’activités existante ; les détails par bloc ne sont pas synchronisés entre appareils. La validation automatique concerne uniquement le programme suivi au départ, si celui-ci n’a pas été remplacé.

Les boutons et barres de progression utilisent les créateurs accessibles de gluestack-ui v5 (`@gluestack-ui/core`), avec les styles natifs Élan. La carte utilise react-native-maps ; le déplacement au doigt suspend le recentrage jusqu’à l’appui sur le contrôle GPS. Expo KeepAwake garde l’écran allumé pendant le suivi. Le comportement existant de pause en arrière-plan est conservé. Aucun coach vocal n’est ajouté.
