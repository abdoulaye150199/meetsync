# 📋 Prompt UML pour MeetSync

## 🎯 PROMPT À UTILISER AVEC CLAUDE

Génère les diagrammes UML complets (Use Case, Classe et Séquence) pour l'application MeetSync avec les multiplicités exactes.

### CONTEXTE DE L'APPLICATION:
MeetSync est une application de gestion de réunions et de tâches avec les fonctionnalités suivantes:

#### **Entités principales:**
1. **Utilisateur (User)** - peut être Host ou Participant
2. **Réunion (Meeting)** - avec statut: scheduled, live, completed, canceled
3. **Participant** - lié aux réunions
4. **Tâche (Task)** - avec priorité (high, medium, low) et statut (pending, in-progress, completed)
5. **Transcript** - enregistrement des discussions
6. **Résumé (Summary)** - généré par IA
7. **Session d'authentification (AuthSession)**
8. **Calendrier (Calendar)**

#### **Fonctionnalités clés:**
- Authentification (login/register)
- Créer/modifier/supprimer des réunions
- Ajouter/gérer des participants
- Gérer des tâches associées aux réunions
- Transcription en temps réel
- Résumé automatique par IA
- Filtrage des réunions (upcoming, live, past, canceled)
- Copie de lien de réunion
- Gestion des droits (Host vs Participant)

### **Générer:**

#### 1. **DIAGRAMME USE CASE:**
   - **Acteur: User (Utilisateur authentifié)**
     - S'authentifier (Login/Register)
     - Créer une réunion
     - Modifier une réunion
     - Supprimer une réunion
     - Démarrer une réunion
     - Terminer une réunion
     - Ajouter des participants
     - Gérer les participants
     - Consulter les tâches
     - Créer une tâche
     - Modifier une tâche
     - Supprimer une tâche
     - Marquer une tâche comme complétée
     - Voir la transcription
     - Copier le lien de réunion
     - Filtrer les réunions
     - Consulter le résumé
   
   - **Acteur: Admin (Administrateur)**
     - Gérer les utilisateurs
     - Supprimer des réunions
     - Consulter les logs
   
   - **Acteur: System (IA)**
     - Générer une transcription
     - Générer un résumé
     - Écouter l'audio de la réunion

#### 2. **DIAGRAMME DE CLASSES:**
   - Toutes les classes (User, Meeting, Task, Participant, Transcript, etc.)
   - Attributs avec types (string, Date, enum pour status/priority)
   - Méthodes principales (create, update, delete, filter, start, end)
   - Relations d'association avec multiplicité (1:1, 1:N, N:N)
   - Héritage si applicable
   - Énumérations (MeetingStatus, TaskStatus, etc.)

#### 3. **DIAGRAMME DE SÉQUENCE:**
   - Scénario 1: Création et lancement d'une réunion
   - Scénario 2: Ajout d'une tâche à une réunion
   - Scénario 3: Génération de résumé IA
   - Montrer les interactions entre classes avec les appels de méthodes

**Format:** Utilise la syntaxe PlantUML ou Mermaid pour que je puisse les visualiser et les exécuter facilement.

---

## 📌 VERSION COURTE (Alternative)

```
Crée les 3 diagrammes UML complets (Use Case, Classe, Séquence) avec multiplicités pour MeetSync:
- Application de gestion de réunions avec gestion de tâches
- Utilisateurs (Host/Participant), Réunions, Tâches, Transcription IA, Résumés
- Fonctionnalités: Auth, CRUD réunions/tâches, transcription, résumé IA, filtrage
- Format: PlantUML ou Mermaid
```
