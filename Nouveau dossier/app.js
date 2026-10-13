
// La liste des catégories proposées dans le menu
var categories = ["Courses", "Restaurants", "Transport", "Logement", "Loisirs", "Santé", "Autre"];

// Le nom sous lequel on sauvegarde dans le navigateur
var CLE = "depenses-v1";

// La liste de toutes les dépenses (au début, elle est vide)
var depenses = [];

// Le mois affiché, au format "2026-10"
var moisAffiche = "";


// 2. FONCTIONS UTILES ----------------------------------------------

// Raccourci pour récupérer un élément HTML grâce à son id
function el(id) {
  return document.getElementById(id);
}

// Renvoie la date d'aujourd'hui au format "2026-10-13"
function dateAujourdhui() {
  var d = new Date();
  var annee = d.getFullYear();
  var mois = String(d.getMonth() + 1).padStart(2, "0"); // getMonth() commence à 0
  var jour = String(d.getDate()).padStart(2, "0");
  return annee + "-" + mois + "-" + jour;
}

// Transforme un nombre en prix : 5000 devient "5 000 F CFA"
function formaterPrix(nombre) {
  return nombre.toLocaleString("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0
  });
}

// Charge les dépenses sauvegardées dans le navigateur
function charger() {
  try {
    var texte = localStorage.getItem(CLE);
    if (texte) {
      depenses = JSON.parse(texte);
    }
  } catch (erreur) {
    depenses = [];
  }
}

// Sauvegarde les dépenses dans le navigateur
function sauvegarder() {
  try {
    localStorage.setItem(CLE, JSON.stringify(depenses));
  } catch (erreur) {
    // On ignore l'erreur : l'appli continue de marcher sans sauvegarde
  }
}


// 3. CHANGER DE MOIS -----------------------------------------------

// decalage = -1 pour le mois précédent, +1 pour le suivant
function changerMois(decalage) {
  var morceaux = moisAffiche.split("-"); // "2026-10" devient ["2026", "10"]
  var annee = Number(morceaux[0]);
  var mois = Number(morceaux[1]);

  mois = mois + decalage;

  if (mois < 1) {
    mois = 12;
    annee = annee - 1;
  }
  if (mois > 12) {
    mois = 1;
    annee = annee + 1;
  }

  moisAffiche = annee + "-" + String(mois).padStart(2, "0");
  afficher();
}


// 4. AJOUTER ET SUPPRIMER ------------------------------------------

function ajouterDepense() {
  // On lit le montant et on remplace la virgule par un point
  var texteMontant = String(el("amount").value).replace(",", ".");
  var montant = parseFloat(texteMontant);

  // Si le montant n'est pas un nombre positif, on s'arrête
  if (!(montant > 0)) {
    el("amount").focus();
    return;
  }

  // Si aucune date n'est choisie, on prend celle d'aujourd'hui
  var date = el("date").value;
  if (date === "") {
    date = dateAujourdhui();
  }

  // On crée la dépense : un objet avec ses informations
  var nouvelle = {
    id: Date.now(),              // un numéro unique
    montant: montant,
    date: date,
    categorie: el("cat").value,
    note: el("note").value.trim()
  };

  depenses.push(nouvelle);       // on l'ajoute à la liste
  sauvegarder();

  // On vide les champs
  el("amount").value = "";
  el("note").value = "";

  // On affiche le mois de la dépense qu'on vient d'ajouter
  moisAffiche = date.slice(0, 7);
  afficher();
}

// Supprime la dépense qui a cet id
function supprimer(id) {
  var restantes = [];
  for (var i = 0; i < depenses.length; i++) {
    if (depenses[i].id !== id) {
      restantes.push(depenses[i]);
    }
  }
  depenses = restantes;
  sauvegarder();
  afficher();
}


// 5. AFFICHER L'ÉCRAN ----------------------------------------------

function afficher() {
  // --- Le titre du mois (ex : "octobre 2026") ---
  var morceaux = moisAffiche.split("-");
  var annee = Number(morceaux[0]);
  var mois = Number(morceaux[1]);
  var premierJour = new Date(annee, mois - 1, 1);
  el("mlabel").textContent = premierJour.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric"
  });

  // --- On garde seulement les dépenses du mois affiché ---
  var duMois = [];
  for (var i = 0; i < depenses.length; i++) {
    if (depenses[i].date.startsWith(moisAffiche)) {
      duMois.push(depenses[i]);
    }
  }

  // On trie : les plus récentes en premier
  duMois.sort(function (a, b) {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.id - a.id;
  });

  // --- Le total du mois ---
  var total = 0;
  for (var i = 0; i < duMois.length; i++) {
    total = total + duMois[i].montant;
  }
  el("total").textContent = formaterPrix(total);

  // --- Le texte "X dépenses ce mois-ci" ---
  if (duMois.length === 0) {
    el("count").textContent = "Aucune dépense ce mois-ci";
  } else if (duMois.length === 1) {
    el("count").textContent = "1 dépense ce mois-ci";
  } else {
    el("count").textContent = duMois.length + " dépenses ce mois-ci";
  }

  // --- Total par catégorie ---
  var parCategorie = {}; // ex : { Courses: 12000, Transport: 3000 }
  for (var i = 0; i < duMois.length; i++) {
    var cat = duMois[i].categorie;
    if (parCategorie[cat] === undefined) {
      parCategorie[cat] = 0;
    }
    parCategorie[cat] = parCategorie[cat] + duMois[i].montant;
  }

  // On met les catégories dans un tableau pour pouvoir les trier
  var listeCat = [];
  for (var nom in parCategorie) {
    listeCat.push({ nom: nom, somme: parCategorie[nom] });
  }
  listeCat.sort(function (a, b) {
    return b.somme - a.somme; // la plus grosse d'abord
  });

  // On construit le HTML des barres
  var htmlBarres = "";
  for (var i = 0; i < listeCat.length; i++) {
    var pourcent = 0;
    if (total > 0) {
      pourcent = (listeCat[i].somme / total) * 100;
    }
    htmlBarres = htmlBarres +
      '<div class="bar">' +
        '<div class="row">' +
          "<span>" + listeCat[i].nom + "</span>" +
          "<span>" + formaterPrix(listeCat[i].somme) + "</span>" +
        "</div>" +
        '<div class="track">' +
          '<div class="fill" style="width:' + pourcent + '%"></div>' +
        "</div>" +
      "</div>";
  }
  el("bars").innerHTML = htmlBarres;

  // --- La liste détaillée des dépenses ---
  var htmlListe = "";

  if (duMois.length === 0) {
    htmlListe = '<li class="empty">Ajoute ta première dépense avec le formulaire ci-dessus.</li>';
  } else {
    for (var i = 0; i < duMois.length; i++) {
      var d = duMois[i];

      // Titre : la note si elle existe, sinon la catégorie
      // (on enlève les symboles < > & par sécurité)
      var titre = d.categorie;
      if (d.note !== "") {
        titre = d.note.replace(/[<>&]/g, "");
      }

      // Date lisible (ex : "13 oct.")
      var dateLisible = new Date(d.date + "T00:00").toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short"
      });

      htmlListe = htmlListe +
        "<li>" +
          '<div class="m">' +
            "<b>" + titre + "</b>" +
            "<small>" + d.categorie + " · " + dateLisible + "</small>" +
          "</div>" +
          '<span class="a">' + formaterPrix(d.montant) + "</span>" +
          '<button aria-label="Supprimer" onclick="supprimer(' + d.id + ')">×</button>' +
        "</li>";
    }
  }
  el("list").innerHTML = htmlListe;
}


// 6. DÉMARRAGE -----------------------------------------------------

// On charge les dépenses sauvegardées
charger();

// On commence sur le mois actuel
moisAffiche = dateAujourdhui().slice(0, 7);

// On remplit le menu des catégories
var htmlOptions = "";
for (var i = 0; i < categories.length; i++) {
  htmlOptions = htmlOptions + "<option>" + categories[i] + "</option>";
}
el("cat").innerHTML = htmlOptions;

// La date du formulaire est celle d'aujourd'hui par défaut
el("date").value = dateAujourdhui();

// On relie les boutons à leurs actions
el("prev").onclick = function () { changerMois(-1); };
el("next").onclick = function () { changerMois(1); };
el("save").onclick = ajouterDepense;

// On affiche l'écran une première fois
afficher();
