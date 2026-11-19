# Données tierces embarquées dans l'appli

Le code et les textes d'Alipto restent sous le `LICENSE` de la racine du dépôt. Les deux fichiers de données ci-dessous viennent de sources ouvertes, reprises aux conditions suivantes.

## `aliments.json`
- Source : table Ciqual 2025 (ANSES), complétée pour les valeurs manquantes par la table CALNUT 2020 (ANSES), https://ciqual.anses.fr/ .
- Licence : Licence Ouverte (Etalab), d'après l'en-tête de `scripts/ciqual.py` qui construit le fichier.
- Attribution : « Anses. 2025. Table de composition nutritionnelle des aliments Ciqual. » et « Anses. 2020. Table CALNUT. »

## `exercices.json`
- Source : Free Exercise DB, dépôt `yuhonas/free-exercise-db`, https://github.com/yuhonas/free-exercise-db (fichier `dist/exercises.json`).
- Licence : Unlicense, lue à la source le 2026-11-01 (`LICENSE.md`) : « This is free and unencumbered software released into the public domain. » Aucune attribution n'est exigée ; elle est donnée ici par courtoisie.
- Ce qui est repris de la source : l'identifiant, le nom anglais, les muscles principaux et secondaires, le matériel, le niveau, le type d'effort et la mécanique. Aucune image de la source n'est reprise.
- Ce qui est à nous : les noms français, les familles de mouvement, les liens vers la bibliothèque de l'assistant et toutes les consignes en français (`scripts/exercices-fr.json`), écrites par Alipto en s'appuyant sur les instructions anglaises de la source, pas traduites mot à mot.
- Construction : `node scripts/exercices.mjs <exercises.json> scripts/exercices-fr.json public/exercices.json`.
