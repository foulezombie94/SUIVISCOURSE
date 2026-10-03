# Activation des connexions

Les parcours Email, téléphone par SMS, Google et Apple sont intégrés dans l’application.
La page lit les méthodes réellement activées dans Supabase et conserve l’accès par Email.

Dans le projet Supabase `twtauwakgzgcuhagthhw` :

- Auth → URL Configuration : ajouter `elanrunning://auth/callback` aux Redirect URLs.
- Auth → Sign In / Providers → Phone : configurer le fournisseur SMS et activer Phone.
- Google : renseigner le Client ID et le Client Secret du client OAuth Web Google.
- Apple : configurer le Service ID et les identifiants de signature Apple.
- Pour Google et Apple, le callback du fournisseur est `https://twtauwakgzgcuhagthhw.supabase.co/auth/v1/callback`.

Les secrets des fournisseurs se configurent dans Supabase, jamais dans les variables Expo publiques.
Pour une URL de retour stable sur mobile, utiliser un development build avec le scheme `elanrunning`.
Le retour Expo Go peut varier avec l’adresse locale du serveur et ne remplace pas cette configuration.

Références :
- https://supabase.com/docs/guides/auth/phone-login
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking
