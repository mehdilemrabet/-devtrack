# Guide du mainteneur (en français)

Ce guide t'explique, étape par étape, comment mettre DevTrack en ligne et le gérer comme un vrai projet open source.

## 1. Mettre les fichiers sur GitHub

Ton dépôt contenait seulement un fichier `.zip`. GitHub ne décompresse pas les archives : il faut envoyer les **fichiers**.

1. Télécharge et **extrais** le zip de ce projet (clic droit → « Extraire tout »).
2. Sur GitHub, dans ton dépôt, ouvre l'ancien fichier `.zip` → menu `⋯` → **Delete file** → *Commit changes*.
3. Clique sur **Add file → Upload files**.
4. Ouvre le dossier extrait, sélectionne **tout son contenu** (Ctrl+A, y compris le dossier `.github`) et glisse-le dans la page. Glisse le contenu, pas le dossier lui-même.
5. Écris un message (« Mise à jour de DevTrack 0.2.0 ») et clique sur **Commit changes**.

L'envoi par navigateur est limité à 100 fichiers à la fois. Si le total dépasse cette limite, envoie en deux fois, ou utilise la ligne de commande :

```bash
git clone https://github.com/mehdilemrabet/devtrack.git
cd devtrack
# copie ici le contenu du dossier extrait (sans le .zip)
git add .
git commit -m "DevTrack 0.2.0"
git push
```

Ne dépose jamais `node_modules/`, `dist/` ni de fichier `.env` : le `.gitignore` les exclut déjà.

## 2. Renommer le dépôt

Le nom actuel (`-devtrack`) commence par un tiret, ce qui pose problème dans les commandes. Va dans **Settings → General → Repository name**, mets `devtrack`. GitHub redirige les anciens liens. Les fichiers du projet supposent le nom `devtrack`.

## 3. Vérifier que tout fonctionne

Onglet **Actions** : le workflow *CI* doit être vert (deux lignes : Node 20 et Node 22). S'il est rouge, ouvre-le, copie l'erreur et envoie-la-moi.

## 4. Réglages recommandés (Settings)

- **Security → Private vulnerability reporting** : activer (nécessaire pour `SECURITY.md`).
- **Branches → Add rule** sur `main` : exiger une pull request et que les contrôles *Test and build* passent.
- **General** : ajouter une description, des *topics* (`github`, `analytics`, `dashboard`, `open-source`) et activer *Issues*.
- **Issues → Labels** : créer ceux listés dans `docs/FIRST_ISSUES.md`.
- **Pages** (démo en ligne) : *Source → GitHub Actions*, puis onglet Actions → *Deploy demo to GitHub Pages* → **Run workflow**. L'adresse de la démo s'affiche à la fin.

## 5. Une vraie capture d'écran

Je n'ai pas pu en produire avec de vraies données depuis mon environnement (limite de requêtes GitHub atteinte), et je ne mets pas de fausses données dans le README.

1. Lance `npm run dev`, ouvre l'adresse affichée, cherche un compte réel (le tien par exemple).
2. Capture la fenêtre (Windows : `Win + Maj + S`), enregistre dans `docs/screenshots/profile.png`.
3. Dans `README.md`, retire les symboles `<!--` et `-->` autour de la ligne d'image.

## 6. Publier une version

Le projet suit le [versionnement sémantique](https://semver.org/lang/fr/) : `0.2.0` = version mineure en phase de démarrage. Corrections → `0.2.1`, nouvelles fonctions → `0.3.0`, changement incompatible après 1.0 → `2.0.0`.

Une fois la CI verte :

```bash
git tag v0.2.0
git push origin v0.2.0
```

Le workflow *Release* crée la page de version avec le build en pièce jointe. Mets `CHANGELOG.md` à jour avant chaque version.

## 7. Routine de mainteneur

- **Chaque semaine** : lire les nouvelles issues, mettre les labels, répondre (même juste « merci, je regarde »), relire les PR et les mises à jour Dependabot.
- **Relire une PR** : la checklist du modèle de PR suffit. Vérifie que les tests passent, que rien n'est inventé dans l'affichage et qu'aucun secret n'est ajouté.
- **Fusionner** : préfère *Squash and merge* pour un historique propre.
- **Premiers contributeurs** : ouvre 3 à 5 issues de `docs/FIRST_ISSUES.md` avec le label `good first issue`, décris précisément le résultat attendu, et sois patient et bienveillant.

## 8. Faire connaître le projet honnêtement

- Attends d'avoir une démo en ligne, une vraie capture et une CI verte.
- Présente le projet tel qu'il est (« projet récent, 0.2.0 ») dans des communautés où il a du sens, et demande des retours précis.
- N'achète pas d'étoiles, ne crée pas de faux comptes et ne cite aucun chiffre que tu ne peux pas prouver. La confiance est le principal atout d'un outil d'analyse.

## 9. Travailler avec Claude

Je ne peux pas écrire directement dans ton dépôt : je prépare les fichiers, tu les envoies. Pour la suite, envoie-moi le contenu mis à jour du dépôt (ou le lien public), l'erreur éventuelle d'une CI, ou l'issue à traiter, et je continue étape par étape.
