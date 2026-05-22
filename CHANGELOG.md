# Changelog

All notable changes to the Prompt Repository project are documented here.

---

## 2026-05-20

### Added
- **ARCHITECTURE.md** - Comprehensive software architecture documentation covering system overview, database schema, API patterns, frontend architecture, AI integration, deployment, and extension patterns. Useful as a template for Enterprise AI projects.
- **AI Chat feature** - Chat with Claude AI about any note! Click the sparkles icon in the note header to open a side drawer where you can ask questions about the note content. Supports streaming responses and works with all note types (text, spreadsheet, prompt). Requires `ANTHROPIC_API_KEY` environment variable.
- **Prompt migration API** - New `/api/migrate-prompts` endpoint to migrate all prompts from the prompts table into notes under the "Prompts" notebook with type='prompt'. GET to preview, POST to execute migration.
- **Delete and move actions in notes sidebar** - Notes can now be deleted or moved to another notebook directly from the sidebar list on hover, without needing to open the note first
- **Travel note icon in sidebar** - Travel itinerary notes now show a plane icon and "Travel Itinerary" label in the notes list
- **Edit Notebook modal** - New modal to edit notebook details including title, description, and custom icon. Access via the "Edit" button in the notebook header
- **Custom notebook icons** - Notebooks can now have custom icons (Notebook, BookOpen, FileText, Database, Table, Folder, Briefcase, Heart, Target, Tag, Calendar, Clock, MapPin)
- **Icon color customization** - Choose from 10 distinct colors for notebook icons: Blue, Purple, Pink, Red, Orange, Amber, Green, Teal, Cyan, Indigo
- **Search bar in Move Note modal** - Filter notebooks by name when moving notes between notebooks
- **Bulk note selection** - Select multiple notes using checkboxes in the notes sidebar
- **Bulk delete notes** - Delete multiple selected notes at once
- **Bulk move notes** - Move multiple selected notes to a different notebook at once
- **Select all notes** - Checkbox in notes header to select/deselect all notes in current notebook

### Changed
- **Move Note modal improvements** - Now shows notebook type icons and descriptions, with better visual hierarchy

### Fixed
- **Notebook update logic** - Fixed database function to properly handle setting, changing, and clearing icon/description fields

### Verified
- **Delete and move buttons available for all note types** - Confirmed that spreadsheet, repository, book, travel, tiktok, and prompt notes all have access to delete and move functionality in both the sidebar (on hover) and the note detail header

### Database Migration Required
To support notebook icons and colors, run these migrations:
```sql
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT NULL;
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS icon_color VARCHAR(20) DEFAULT NULL;
```

---

## 2026-05-19

### Changed
- **Simplified notebook creation** - Notebook creation now uses a single type with just title and description fields

---

## 2026-05-14

### Added
- **Repository and Spreadsheet notebook types** - New notebook type options for better organization
- **Collapse/expand toggle for TikTok scripts drawer** - Better UI control for the scripts panel
- **Alphabetical sorting toggle for prompts list** - Sort prompts A-Z with a toggle button

### Fixed
- **Notes drawer not updating when switching notebooks** - Fixed state sync issue

---

## 2026-05-12

### Fixed
- **Book editor losing active chapter state** - Chapter selection now persists correctly
- **Book chapters exiting editing mode on button clicks** - Editing mode stays active during interactions

---

## 2026-05-08

### Changed
- **Row height controls in spreadsheet** - Replaced drag-resize with radio button height controls for better UX

### Added
- **Resizable row heights in spreadsheet template** - Rows can now have adjustable heights

---

## 2026-05-03

### Added
- **Chapter sorting feature for Book template** - Chapters can now be sorted/reordered

---

## 2026-04-30

### Added
- **TikTok Scripts template** - New template for managing video scripts with single text area and one-click copy
- **Undo/redo support for book chapters** - CMD+Z / CMD+SHIFT+Z keyboard shortcuts

### Fixed
- **Chapter drag-and-drop reordering in BookEditor** - Reordering now works correctly

### Changed
- **TikTok Scripts simplified** - Streamlined to single text area with one-click copy functionality
- **Version names shown in Save Version modal** - Existing version names displayed when saving

---

## 2026-04-29

### Added
- **Version renaming for book chapters** - Versions can now be renamed
- **Click-to-load for chapter versions** - Click a version to load it instantly

### Fixed
- **Duplicate version names prevented** - Validation added for unique version names

---

## 2026-04-22

### Changed
- **README updated** - Comprehensive feature documentation added

---

## 2026-04-20

### Added
- **Travel template** - Card-based Travel Itinerary template replacing spreadsheet version
- **Travel Itinerary spreadsheet template** - Multi-table structure for travel planning

---

## 2026-04-18

### Added
- **Version control for book chapters** - Save and restore chapter versions

---

## 2026-04-15

### Added
- **Repository category in Create New Note modal** - With Prompt and Filepath sub-types

---

## 2026-04-14

### Added
- **Auto-numbering for book chapters** - Automatic chapter numbering with toggle support

---

## 2026-04-13

### Added
- **Drag-and-drop reordering for chapters** - Chapters in BookEditor can be reordered by dragging
- **Book template with draggable chapters** - New notebook template for writing books

---

## 2026-04-09

### Fixed
- **Chapter rename improvements** - Suppressed toast, inline editable title, explicit save button

---

## Note Types Supported

All note types support individual deletion and moving to different notebooks:
- Text notes
- Spreadsheet notes
- Book/Chapter notes
- Travel Itinerary notes
- TikTok Scripts notes
- Prompt notes
