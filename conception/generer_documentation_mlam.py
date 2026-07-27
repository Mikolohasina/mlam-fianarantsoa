"""
generer_documentation_mlam.py
──────────────────────────────────────────────────────────────────────────
Génère le dossier technique et le script de présentation orale pour la
soutenance du projet M'LAM v1.0 (Fianarantsoa) au format Word (.docx).

Installation requise :
    pip install python-docx

Exécution :
    python generer_documentation_mlam.py

Sortie :
    Documentation_Et_Pitch_MLAM.docx (dans le dossier courant)
──────────────────────────────────────────────────────────────────────────
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# ══════════════════════════════════════════════════════════════════════════
# PALETTE DE COULEURS — cohérente avec la charte "Ardoise / Blueprint mat"
# ══════════════════════════════════════════════════════════════════════════

COULEUR_TITRE_PRINCIPAL = RGBColor(0x0F, 0x17, 0x2A)   # slate-950 — bleu nuit
COULEUR_TITRE_SECTION   = RGBColor(0x1E, 0x29, 0x3B)   # slate-800 — ardoise
COULEUR_SOUS_TITRE      = RGBColor(0x47, 0x55, 0x69)   # slate-600 — gris ardoise
COULEUR_ACCENT          = RGBColor(0x33, 0x41, 0x55)   # slate-700 — accent
COULEUR_TEXTE           = RGBColor(0x1E, 0x29, 0x3B)   # slate-800 — texte courant
COULEUR_TEXTE_CLAIR     = RGBColor(0x64, 0x74, 0x8B)   # slate-500 — texte secondaire
COULEUR_LIGNE           = RGBColor(0xCB, 0xD5, 0xE1)   # slate-300 — filet
COULEUR_TABLE_ENTETE_BG = "1E293B"                      # fond d'en-tête de tableau
COULEUR_TABLE_ALT_BG    = "F1F5F9"                       # fond alterné de tableau
COULEUR_ALERTE_BG       = "FEF2F2"                        # fond bloc alerte (rouge très clair)
COULEUR_ALERTE_TXT      = RGBColor(0x99, 0x1B, 0x1B)      # texte bloc alerte


# ══════════════════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES DE MISE EN FORME
# ══════════════════════════════════════════════════════════════════════════

def definir_marges(document, cm=2.0):
    """Applique des marges élégantes et homogènes sur toutes les sections."""
    for section in document.sections:
        section.top_margin = Cm(cm)
        section.bottom_margin = Cm(cm)
        section.left_margin = Cm(cm + 0.3)
        section.right_margin = Cm(cm + 0.3)


def definir_police_normale(document, nom="Calibri", taille=11):
    """Configure la police par défaut du document."""
    style = document.styles["Normal"]
    style.font.name = nom
    style.font.size = Pt(taille)
    style.font.color.rgb = COULEUR_TEXTE
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.line_spacing = 1.15


def ombrer_cellule(cellule, couleur_hex):
    """Applique une couleur de fond à une cellule de tableau."""
    tc_pr = cellule._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), couleur_hex)
    tc_pr.append(shd)


def ajouter_filet_horizontal(document, couleur="1E293B", epaisseur=12):
    """Ajoute une ligne de séparation horizontale élégante (bordure de paragraphe)."""
    paragraphe = document.add_paragraph()
    paragraphe.paragraph_format.space_before = Pt(2)
    paragraphe.paragraph_format.space_after = Pt(10)
    p_pr = paragraphe._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(epaisseur))
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), couleur)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)
    return paragraphe


def titre_page_garde(document, texte, taille=26):
    """Titre principal centré, en gros caractères, bleu nuit."""
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(texte)
    run.bold = True
    run.font.size = Pt(taille)
    run.font.color.rgb = COULEUR_TITRE_PRINCIPAL
    run.font.name = "Calibri"
    return p


def sous_titre_page_garde(document, texte, taille=14, italique=True):
    """Sous-titre centré, gris ardoise."""
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(texte)
    run.italic = italique
    run.font.size = Pt(taille)
    run.font.color.rgb = COULEUR_SOUS_TITRE
    return p


def titre_h1(document, numero, texte):
    """Titre de chapitre — grand, encadré visuellement par un filet."""
    document.add_page_break()
    p = document.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    run_num = p.add_run(f"CHAPITRE {numero}")
    run_num.bold = True
    run_num.font.size = Pt(11)
    run_num.font.color.rgb = COULEUR_TEXTE_CLAIR

    p2 = document.add_paragraph()
    p2.paragraph_format.space_after = Pt(4)
    run = p2.add_run(texte)
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = COULEUR_TITRE_PRINCIPAL

    ajouter_filet_horizontal(document, couleur="1E293B", epaisseur=16)
    return p2


def titre_h2(document, texte):
    """Sous-titre de section — moyen, ardoise."""
    p = document.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(texte)
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = COULEUR_TITRE_SECTION
    return p


def titre_h3(document, texte):
    """Sous-sous-titre — petit, accent."""
    p = document.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(texte)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = COULEUR_ACCENT
    return p


def paragraphe_normal(document, texte, taille=11, justifie=True):
    """Paragraphe de texte courant, justifié."""
    p = document.add_paragraph()
    if justifie:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(texte)
    run.font.size = Pt(taille)
    run.font.color.rgb = COULEUR_TEXTE
    return p


def paragraphe_avec_gras(document, segments, taille=11, justifie=True):
    """
    Paragraphe avec parties en gras. `segments` est une liste de tuples
    (texte, est_gras) permettant de mixer gras/normal dans une même phrase.
    """
    p = document.add_paragraph()
    if justifie:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(8)
    for texte, est_gras in segments:
        run = p.add_run(texte)
        run.bold = est_gras
        run.font.size = Pt(taille)
        run.font.color.rgb = COULEUR_TEXTE
    return p


def puce(document, texte, niveau=0, taille=11):
    """Élément de liste à puce, avec mot-clé en gras optionnel avant ' — '."""
    p = document.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(0.6 + niveau * 0.6)
    p.paragraph_format.space_after = Pt(4)

    if " — " in texte:
        mot_cle, reste = texte.split(" — ", 1)
        run1 = p.add_run(mot_cle + " — ")
        run1.bold = True
        run1.font.size = Pt(taille)
        run1.font.color.rgb = COULEUR_ACCENT
        run2 = p.add_run(reste)
        run2.font.size = Pt(taille)
        run2.font.color.rgb = COULEUR_TEXTE
    else:
        run = p.add_run(texte)
        run.font.size = Pt(taille)
        run.font.color.rgb = COULEUR_TEXTE
    return p


def puce_numerotee(document, texte, taille=11):
    """Élément de liste numérotée."""
    p = document.add_paragraph(style="List Number")
    p.paragraph_format.left_indent = Cm(0.6)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(texte)
    run.font.size = Pt(taille)
    run.font.color.rgb = COULEUR_TEXTE
    return p


def bloc_encadre(document, titre, contenu_lignes, couleur_fond="F1F5F9", couleur_titre=None):
    """
    Insère un bloc encadré (via un tableau à une cellule) pour mettre en
    valeur une citation, une devise ou une note importante.
    """
    if couleur_titre is None:
        couleur_titre = COULEUR_ACCENT

    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cellule = table.rows[0].cells[0]
    ombrer_cellule(cellule, couleur_fond)
    cellule.width = Cm(16)

    if titre:
        p_titre = cellule.paragraphs[0]
        run = p_titre.add_run(titre)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = couleur_titre
        p_titre.paragraph_format.space_after = Pt(4)
    else:
        cellule.paragraphs[0].text = ""

    for ligne in contenu_lignes:
        p = cellule.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(ligne)
        run.italic = True
        run.font.size = Pt(11)
        run.font.color.rgb = COULEUR_TEXTE

    # Espacement après le bloc
    document.add_paragraph().paragraph_format.space_after = Pt(4)
    return table


def tableau_deux_colonnes(document, entete_gauche, entete_droite, lignes):
    """
    Crée un tableau à deux colonnes stylé (fichier / rôle technique,
    technologie / justification, etc.), avec en-tête sombre et lignes
    alternées clair/blanc.
    """
    table = document.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    largeur_gauche = Cm(5.5)
    largeur_droite = Cm(10.5)

    # En-tête
    hdr_cells = table.rows[0].cells
    hdr_cells[0].width = largeur_gauche
    hdr_cells[1].width = largeur_droite
    for cell, texte in zip(hdr_cells, (entete_gauche, entete_droite)):
        ombrer_cellule(cell, COULEUR_TABLE_ENTETE_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        run = p.add_run(texte)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Lignes de contenu
    for i, (col_gauche, col_droite) in enumerate(lignes):
        row_cells = table.add_row().cells
        row_cells[0].width = largeur_gauche
        row_cells[1].width = largeur_droite

        if i % 2 == 1:
            for cell in row_cells:
                ombrer_cellule(cell, COULEUR_TABLE_ALT_BG)

        run_g = row_cells[0].paragraphs[0].add_run(col_gauche)
        run_g.bold = True
        run_g.font.size = Pt(10.5)
        run_g.font.color.rgb = COULEUR_ACCENT

        run_d = row_cells[1].paragraphs[0].add_run(col_droite)
        run_d.font.size = Pt(10.5)
        run_d.font.color.rgb = COULEUR_TEXTE

    document.add_paragraph().paragraph_format.space_after = Pt(6)
    return table


def bloc_minutage(document, duree, titre, points):
    """Bloc de script oral avec minutage affiché en badge."""
    p = document.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)

    run_badge = p.add_run(f"  {duree}  ")
    run_badge.bold = True
    run_badge.font.size = Pt(10)
    run_badge.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    # Simulation d'un badge via ombrage de run (shading sur le texte)
    r_pr = run_badge._r.get_or_add_rPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "334155")
    r_pr.append(shd)

    run_titre = p.add_run("   " + titre)
    run_titre.bold = True
    run_titre.font.size = Pt(13)
    run_titre.font.color.rgb = COULEUR_TITRE_SECTION

    for point in points:
        puce(document, point, taille=11)


def bloc_alerte(document, titre, points):
    """Bloc rouge clair pour la fiche 'en cas de bug sur scène'."""
    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cellule = table.rows[0].cells[0]
    ombrer_cellule(cellule, COULEUR_ALERTE_BG)
    cellule.width = Cm(16)

    p_titre = cellule.paragraphs[0]
    run = p_titre.add_run(titre)
    run.bold = True
    run.font.size = Pt(13)
    run.font.color.rgb = COULEUR_ALERTE_TXT
    p_titre.paragraph_format.space_after = Pt(6)

    for i, point in enumerate(points, start=1):
        p = cellule.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        run_num = p.add_run(f"{i}. ")
        run_num.bold = True
        run_num.font.size = Pt(11)
        run_num.font.color.rgb = COULEUR_ALERTE_TXT
        run_txt = p.add_run(point)
        run_txt.font.size = Pt(11)
        run_txt.font.color.rgb = COULEUR_ALERTE_TXT

    document.add_paragraph().paragraph_format.space_after = Pt(4)
    return table


def pied_de_page(document, texte):
    """Ajoute un texte de pied de page identique sur toutes les sections."""
    for section in document.sections:
        footer = section.footer
        p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.text = ""
        run = p.add_run(texte)
        run.font.size = Pt(8)
        run.font.color.rgb = COULEUR_TEXTE_CLAIR
        run.italic = True


# ══════════════════════════════════════════════════════════════════════════
# CONSTRUCTION DU DOCUMENT
# ══════════════════════════════════════════════════════════════════════════

def construire_document():
    document = Document()
    definir_marges(document, cm=2.0)
    definir_police_normale(document, nom="Calibri", taille=11)
    pied_de_page(document, "M'LAM v1.0 — Dossier Technique & Script de Présentation — Fianarantsoa")

    # ─────────────────────────────────────────────────────────────────────
    # PAGE DE GARDE
    # ─────────────────────────────────────────────────────────────────────

    for _ in range(3):
        document.add_paragraph()

    titre_page_garde(document, "DOSSIER TECHNIQUE & SCRIPT DE PRÉSENTATION", taille=24)
    titre_page_garde(document, "M'LAM v1.0 — FIANARANTSOA", taille=28)

    document.add_paragraph()
    sous_titre_page_garde(
        document,
        "Système unifié de supervision urbaine, régulation du trafic et surveillance environnementale",
        taille=13,
    )

    document.add_paragraph()
    ajouter_filet_horizontal(document, couleur="CBD5E1", epaisseur=8)

    document.add_paragraph()
    bloc_encadre(
        document,
        titre=None,
        contenu_lignes=[
            "« Ho an'ny tanàna milamina sy mandroso »",
            "Pour une ville harmonieuse et prospère",
        ],
        couleur_fond="F1F5F9",
    )

    titre_h3(document, "Branding — L'étymologie de M'LAM")
    paragraphe_avec_gras(document, [
        ("M'LAM ", True),
        ("(Mikolo's Learned App Monitoring) puise sa racine sémantique dans le terme malagasy ", False),
        ("« Milamina »", True),
        (", qui désigne un état de calme, d'ordre et d'équilibre systémique. Cette philosophie structure "
         "l'ensemble de la plateforme autour de trois piliers mesurables : ", False),
        ("l'Ordre", True),
        (" (fluidité de circulation), ", False),
        ("le Calme", True),
        (" (stabilité environnementale) et ", False),
        ("l'Harmonie systémique", True),
        (" (prospérité soutenable de la ville de Fianarantsoa).", False),
    ])

    document.add_paragraph()
    p_date = document.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_date.add_run("Version 1.0 — Juillet 2026")
    run.font.size = Pt(10)
    run.font.color.rgb = COULEUR_TEXTE_CLAIR
    run.italic = True

    # ═════════════════════════════════════════════════════════════════════
    # CHAPITRE 1 — LE PITCH DE PRÉSENTATION (SCRIPT ORAL MINUTE PAR MINUTE)
    # ═════════════════════════════════════════════════════════════════════

    titre_h1(document, 1, "Le Pitch de Présentation — Script Oral Minute par Minute")

    paragraphe_normal(
        document,
        "Ce script est conçu pour une soutenance orale de six minutes environ. Chaque bloc "
        "correspond à une phase distincte de la démonstration, avec un minutage indicatif et les "
        "points clés à exprimer à voix haute devant le jury.",
    )

    bloc_minutage(document, "0:00 – 1:00", "Introduction — L'âme du projet", [
        "Présenter le choix de la ville de Fianarantsoa — "
        "une ville en croissance urbaine confrontée à une densification progressive de son réseau routier.",
        "Expliquer le concept fondateur « Milamina » — "
        "l'harmonie, le calme et l'ordre comme fil conducteur de toute la conception applicative.",
        "Annoncer la promesse du projet — "
        "un outil unifié de supervision qui relie trafic routier, qualité de l'air et décision publique.",
    ])

    bloc_minutage(document, "1:00 – 3:00", "Le Problème & Le Modèle Hybride", [
        "Poser le constat — "
        "la congestion routière sur la RN7 et les axes secondaires n'est pas qu'un problème de mobilité, "
        "c'est aussi un facteur direct de dégradation de la qualité de l'air.",
        "Expliquer la chaîne de causalité — "
        "densité véhiculaire élevée → ralentissement → stationnement prolongé → émissions accrues → "
        "accumulation de CO2 et de particules fines PM2.5 par quartier.",
        "Souligner l'innovation du modèle hybride — "
        "M'LAM ne simule pas la pollution de façon aléatoire déconnectée : elle est mathématiquement "
        "dérivée de l'état réel du trafic simulé, axe par axe, en temps réel.",
    ])

    bloc_minutage(document, "3:00 – 5:00", "La Démonstration du Moteur", [
        "Montrer la carte interactive — "
        "React-Leaflet affiche le réseau routier réel de Fianarantsoa avec des véhicules en mouvement.",
        "Basculer sur la vue Qualité de l'Air — "
        "révéler la Heatmap de pollution en Canvas HTML5, avec ses dégradés radiaux flous "
        "représentant les nuages de pollution par quartier.",
        "Déclencher ou montrer une anomalie en direct — "
        "expliquer les causes réalistes générées par le moteur : incinération sauvage d'ordures "
        "ménagères, émissions industrielles diffuses d'ateliers de briqueterie, accumulation de gaz "
        "d'échappement des vieux moteurs Diesel et des Taxibes en l'absence de vent.",
    ])

    bloc_minutage(document, "5:00 – 6:00", "L'IA & La Décision Politico-Environnementale", [
        "Cliquer sur « Générer Rapport IA » depuis une anomalie environnementale critique.",
        "Expliquer la télétransmission simulée — "
        "le rapport est automatiquement structuré et adressé, dans son en-tête, à la Direction "
        "Régionale du Ministère de l'Environnement et du Développement Durable (MEDD).",
        "Insister sur la valeur ajoutée — "
        "le rapport ne se contente pas de constater, il recommande des actions de politique publique "
        "(capteurs fixes, sensibilisation, régulation des zones industrielles).",
    ])

    bloc_minutage(document, "6:00 – 7:00", "Conclusion & Vision Enterprise", [
        "Ouvrir le panneau Paramètres — "
        "démontrer que M'LAM n'est pas un simple prototype visuel mais une plateforme pensée "
        "pour un usage institutionnel réel.",
        "Anonymisation SHA-256 — "
        "hachage cryptographique des plaques d'immatriculation des Taxibes, conformité RGPD.",
        "Chiffrement AES-256 — "
        "sécurisation du canal radio et des transmissions automatiques de rapports.",
        "Export CSV / PDF — "
        "registre des anomalies exportable et bilan environnemental mensuel téléchargeable.",
        "Terminer sur la devise du projet — "
        "rappeler que M'LAM vise, au-delà de la technique, une ville plus harmonieuse et prospère "
        "pour les habitants de Fianarantsoa.",
    ])

    # ═════════════════════════════════════════════════════════════════════
    # CHAPITRE 2 — GUIDE DE SURVIE TECHNIQUE (QUESTIONS DU JURY)
    # ═════════════════════════════════════════════════════════════════════

    titre_h1(document, 2, "Guide de Survie Technique — Questions du Jury")

    titre_h2(document, "2.1 — Cartographie du Code : à quoi sert chaque fichier ?")

    paragraphe_normal(
        document,
        "Le tableau suivant synthétise le rôle fonctionnel de chaque composant clé de "
        "l'architecture, à utiliser comme aide-mémoire en cas de question précise du jury sur "
        "l'organisation du code.",
    )

    tableau_deux_colonnes(
        document,
        "Fichier / Concept",
        "Rôle technique",
        [
            (
                "App.jsx",
                "Le cerveau et la mémoire vive de l'application. Composant racine qui centralise "
                "tous les états globaux via useState (onglet actif, paramètres de simulation, "
                "préférences de sécurité) et orchestre le passage des données aux composants enfants "
                "par props.",
            ),
            (
                "CityMap.jsx",
                "Le module de cartographie. Encapsule React-Leaflet pour afficher les tuiles "
                "géographiques, génère dynamiquement les tracés de routes et les marqueurs "
                "d'anomalies via des boucles .map() sur les données de simulation.",
            ),
            (
                "Canvas HTML5",
                "Le moteur de rendu thermique. Une matrice de pixels manipulée directement via "
                "getContext('2d'), utilisée pour dessiner les véhicules en mouvement et les "
                "dégradés radiaux de pollution (createRadialGradient + filtre de flou), sans "
                "passer par le Virtual DOM de React pour préserver la fluidité à 60 images/seconde.",
            ),
            (
                "useEffect + Tick",
                "Le moteur temporel de la simulation. Un hook useEffect combiné à une vérification "
                "de performance.now() joue le rôle d'un setInterval contrôlé, déclenchant toutes "
                "les 2,5 secondes la génération d'anomalies aléatoires (Math.random()) et "
                "l'ajustement des indices de pollution par axe routier.",
            ),
            (
                "useState",
                "La mémoire vive réactive. Chaque changement d'état (filtre actif, thème, seuils "
                "d'alerte) déclenche un nouveau rendu ciblé de l'interface, garantissant une "
                "synchronisation immédiate entre les paramètres et l'affichage.",
            ),
            (
                "useRef",
                "La mémoire persistante hors-rendu. Utilisé pour stocker la flotte de véhicules "
                "simulée sans déclencher de re-rendu React à chaque frame, un choix essentiel "
                "pour la performance de l'animation temps réel.",
            ),
        ],
    )

    titre_h2(document, "2.2 — Explication pas-à-pas des choix technologiques")

    titre_h3(document, "Pourquoi React ?")
    paragraphe_normal(
        document,
        "React impose une architecture par composants réutilisables et un modèle de données "
        "unidirectionnel (state descendant vers les props). Pour une application de supervision "
        "où de nombreux indicateurs doivent rester synchronisés en permanence (carte, sidebar, "
        "compteurs, modale de rapport), ce modèle réduit drastiquement les risques d'incohérence "
        "entre les vues, comparé à une manipulation manuelle du DOM.",
    )

    titre_h3(document, "Pourquoi Vite ?")
    paragraphe_normal(
        document,
        "Vite exploite les modules ECMAScript natifs du navigateur et compile à la demande, ce "
        "qui donne un démarrage quasi instantané du serveur de développement et un Hot Module "
        "Replacement préservant l'état de la simulation en cours pendant le développement — un "
        "gain de temps déterminant sur un projet itératif comme celui-ci.",
    )

    titre_h3(document, "Pourquoi Tailwind CSS ?")
    paragraphe_normal(
        document,
        "Tailwind permet de construire une charte graphique cohérente — le style « Blueprint / "
        "Carreau mat » de M'LAM — directement dans le balisage, sans jongler entre des dizaines "
        "de fichiers CSS. Cette approche garantit une homogénéité visuelle stricte entre tous les "
        "écrans de l'application, essentielle pour un outil de supervision professionnel où la "
        "lisibilité prime sur la décoration.",
    )

    titre_h3(document, "Quelle différence entre HTML Canvas et HTML5 ?")
    paragraphe_normal(
        document,
        "HTML5 est la version du langage de balisage qui a introduit, entre autres nouveautés, "
        "l'élément <canvas>. Le Canvas n'est donc pas un concept concurrent de HTML5 mais l'une "
        "de ses briques constitutives : une zone de dessin bitmap manipulable via JavaScript "
        "(API Canvas 2D), utilisée dans M'LAM pour tout rendu graphique à haute fréquence "
        "(véhicules, nuages de pollution) que le DOM classique ne pourrait pas gérer sans perte "
        "de performance.",
    )

    titre_h3(document, "Pourquoi React-Leaflet est une bibliothèque et non un framework ?")
    paragraphe_normal(
        document,
        "React-Leaflet est une bibliothèque car elle fournit un ensemble ciblé de composants "
        "React (TileLayer, Marker, Polyline) qui encapsulent Leaflet.js, sans imposer de "
        "structure globale à l'application. Contrairement à un framework, qui dicterait "
        "l'architecture complète du projet, une bibliothèque s'intègre localement là où elle est "
        "nécessaire — ici, uniquement dans le composant CityMap.jsx — laissant React piloter le "
        "reste de l'application.",
    )

    # ═════════════════════════════════════════════════════════════════════
    # CHAPITRE 3 — FICHE RÉSUMÉE « EN CAS DE BUG SUR SCÈNE »
    # ═════════════════════════════════════════════════════════════════════

    titre_h1(document, 3, "Fiche Résumée — En Cas de Bug sur Scène")

    paragraphe_normal(
        document,
        "Une démonstration en direct comporte toujours un risque technique. Voici les trois "
        "réflexes à appliquer dans l'ordre, sans perdre le fil de la présentation.",
    )

    bloc_alerte(document, "PROTOCOLE D'URGENCE — 3 CONSIGNES", [
        "Relancer le serveur de développement avec la commande : "
        "npm run dev -- --force — cette option force Vite à reconstruire le cache de "
        "dépendances, résolvant la majorité des erreurs d'affichage inexpliquées.",
        "Ouvrir l'application dans une fenêtre de navigation privée — "
        "cela élimine instantanément les conflits liés au cache navigateur ou aux extensions "
        "installées, cause fréquente de bugs visuels fantômes.",
        "Garder le calme et commenter à voix haute — "
        "un jury valorise davantage la capacité à diagnostiquer calmement un incident en direct "
        "que l'absence totale d'imprévu. Décrire ce qui se passe pendant la résolution transforme "
        "l'incident en démonstration de maîtrise technique.",
    ])

    document.add_paragraph()
    p_fin = document.add_paragraph()
    p_fin.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_fin.add_run("« Ho an'ny tanàna milamina sy mandroso »")
    run.italic = True
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = COULEUR_TITRE_SECTION

    return document


# ══════════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════════════════

def main():
    nom_fichier = "Documentation_Et_Pitch_MLAM.docx"
    document = construire_document()
    document.save(nom_fichier)
    print(f"Document généré avec succès : {nom_fichier}")


if __name__ == "__main__":
    main()
