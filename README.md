# Élan — application mobile de running

Phases 1 et 2 de l'application, créées avec Expo SDK 57, React Native, TypeScript strict, Expo Router et Supabase. Le projet est dans `C:\Users\pc\Desktop\Suivi course\app-mobile`.

## Démarrer

```powershell
cd 'C:\Users\pc\Desktop\Suivi course\app-mobile'
npm install
npx expo start
```

Le fichier `.env` local contient l'URL du projet Supabase et sa clé **publishable**. Il est ignoré par Git. Pour une autre installation, copier `.env.example` vers `.env` et renseigner ces deux valeurs. Ne jamais mettre une clé `service_role` dans l'application.

Ouvrir le QR code avec Expo Go SDK 57 sur un téléphone Android ou iOS. Accorder l'autorisation de localisation seulement lors du premier départ. Le suivi de cette version fonctionne au premier plan : si l'application passe en arrière-plan, la course est mise en pause et peut être reprise au retour. Un suivi GPS continu en arrière-plan nécessitera un development build et une implémentation dédiée.

## Phase 1

- Onboarding, inscription, connexion, restauration de session et déconnexion.
- Profil personnel, code ami unique, demandes d'amis mutuelles, suppression d'amis.
- Course running, marche ou trail avec GPS, pause, reprise, pause automatique, distance, allure, dénivelé, carte et splits kilométriques. Le temps écoulé suit l'horloge réelle ; le temps en mouvement provient des intervalles GPS acceptés. Un long trou GPS reste inconnu et n'est pas ajouté artificiellement au temps en mouvement.
- Sauvegarde locale régulière, restauration d'une course interrompue et synchronisation Supabase après la course ou le retour du réseau.
- Historique paginé, détail des activités, records personnels, Run Card exportable en trois formats et trois styles.

## Phase 2

- Fil paginé des courses **choisies par les amis pour le partage**, sans likes ni commentaires. Les tracés GPS complets ne sont jamais lisibles par les amis.
- Run Score calculé localement à partir de la régularité, de l'endurance et des anciennes performances du même coureur. Ce score n'est pas une donnée médicale.
- Badges déterministes, objectifs hebdomadaires/mensuels de distance et de courses, objectifs chrono personnels sur 5 et 10 km, progression et notification d'objectif atteint.
- Challenges officiels mensuels et challenges privés entre amis, avec invitations, acceptation et progression.
- Battles entre 2 à 5 amis (distance cible, distance totale, nombre de courses, meilleur 5 ou 10 km), invitations et progression. Le premier à atteindre une distance cible est mémorisé côté serveur.
- Classement distance ou nombre de courses entre amis sur une semaine, un mois ou une année.
- Run Together sur invitation et confirmation explicite, sans détection de proximité.
- Boîte de notifications dans l'app, actualisée tant qu'elle est ouverte. Les notifications push lorsque l'app est fermée demandent un development build et une configuration EAS/FCM/APNs ; elles ne sont pas comprises dans la version Expo Go.

Les compétitions ne comptent que les courses effectivement partagées et considérées plausibles. Une course incohérente reste dans l'historique mais n'apparaît pas dans les classements. La détection côté serveur bloque les vitesses manifestement impossibles ; elle ne constitue pas une protection totale contre la fraude GPS.

La barre d'onglets utilise la navigation native Expo Router, avec Liquid Glass fourni par iOS 26. Les systèmes plus anciens et Android utilisent leur barre native. `react-native-maps` est installé avec la version compatible Expo SDK 57.

Ghost, Run DNA, la carte d'exploration et les fonctions avancées restent prévus pour la phase 3. Aucun réseau social public, like ou commentaire n'est prévu.

## Données et confidentialité

Les migrations SQL de `supabase/migrations/` ont été appliquées au projet Supabase `twtauwakgzgcuhagthhw`. Toutes les tables métier ont RLS. Le tracé GPS complet est accessible à son propriétaire uniquement. Chaque course est privée par défaut. Lorsqu'une course est partagée, les amis consultent une table séparée contenant uniquement son résumé, jamais les points GPS. Les données de session sont conservées dans SecureStore et les courses en cours dans AsyncStorage.

La recherche par code ami passe désormais par une fonction publique `SECURITY INVOKER` qui appelle un accès privilégié borné dans le schéma `private`, non exposé par l'API. Le conseiller de sécurité Supabase ne signale plus d'alerte. Les invitations sociales sont limitées par utilisateur sur 24 heures ; les valeurs des splits et records sont contrôlées côté base avant écriture.

Avant une publication, valider une longue course, les pauses et les reprises sur de vrais téléphones Android/iOS. L'audit npm actuel remonte 14 avis de sévérité modérée dans l'écosystème Expo et ses dépendances, sans avis de sévérité haute ou critique ; les corrections automatiques proposées impliquent des versions incompatibles avec SDK 57. Aucun changement de version forcé n'a été appliqué.

## Organisation

- `src/app/` : écrans et navigation Expo Router.
- `src/features/tracking/` et `src/store/` : calcul GPS, buffer mutable des points et état léger de la course.
- `src/services/` : stockage local, synchronisation, amis et Supabase.
- `src/components/` : interface, carte et Run Card.
- `src/types/` : modèle de données et types Supabase générés.
- `supabase/migrations/` : schéma, fonctions, règles RLS et déclencheurs de progression sociale.

## Contrôles techniques

```powershell
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo export --platform android
```

Aucun framework ni fichier de tests n'a été ajouté, conformément au cahier des charges. Les contrôles statiques et l'export Android ne remplacent pas une validation GPS sur téléphone avant publication.
