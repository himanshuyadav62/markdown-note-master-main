# Planning Guide

A streamlined note-taking application that empowers users to capture, organize, and retrieve thoughts with rich text formatting, image embedding, file attachments, and instant search.

**Experience Qualities**:
1. **Focused** - The interface should minimize distractions and keep the user's attention on writing and finding notes
2. **Fluid** - Transitions between viewing, editing, and searching should feel seamless and natural
3. **Responsive** - Actions should feel immediate with no lag between thought and capture

**Complexity Level**: Light Application (multiple features with basic state)
The app combines note creation/editing, rich text editing, image pasting, file attachments, and search functionality with persistent storage, making it more than a single-purpose tool but not requiring complex user accounts or advanced state management.

## Essential Features

### Note Creation
- **Functionality**: Users can create new notes with a title and rich text formatted content
- **Purpose**: Provides the core value of capturing thoughts quickly with visual formatting
- **Trigger**: Click "New Note" button
- **Progression**: Click New Note → Note editor opens with empty fields → User types title and content → Auto-saves as they type
- **Success criteria**: New note appears in the notes list and persists after page reload

### Rich Text Editing
- **Functionality**: Users can format text with bold, italic, underline, strikethrough, headings, lists, quotes, code, and text alignment
- **Purpose**: Allows expressive and organized note-taking beyond plain text
- **Trigger**: Click on any note or create new note
- **Progression**: Click note → Editor loads with rich formatting toolbar → User types and formats content → Changes auto-save → Formatting displays in real-time
- **Success criteria**: All formatting persists across sessions and displays correctly in both editor and note preview

### Image Pasting & Embedding
- **Functionality**: Users can paste images directly from clipboard or insert from files
- **Purpose**: Enables visual note-taking with screenshots, diagrams, and photos
- **Trigger**: Paste image (Ctrl/Cmd+V) or click image button in toolbar
- **Progression**: User copies image → Pastes into editor → Image appears inline with content → Stores as base64 data → Persists with note
- **Success criteria**: Images load quickly, display at appropriate sizes, and persist across sessions

### File Attachments
- **Functionality**: Users can attach files of any type (documents, PDFs, archives, etc.) to notes with size limit of 10MB per file
- **Purpose**: Keeps related files organized with notes for complete context
- **Trigger**: Click "Add Files" button in attachment section
- **Progression**: Click Add Files → File picker opens → Select files → Files upload and appear in attachment list → Download or remove as needed
- **Success criteria**: Attachments persist with notes, can be downloaded, and display file type icons and sizes

### Search Functionality
- **Functionality**: Real-time search filtering across note titles and content
- **Purpose**: Enables quick retrieval of information from many notes
- **Trigger**: User types in search input
- **Progression**: User focuses search field → Types query → Note list filters instantly → Matching text highlighted → Clear search to restore full list
- **Success criteria**: Search returns relevant results within 100ms and handles partial matches

### Note Deletion with Recycle Bin
- **Functionality**: Soft-delete notes to a recycle bin with ability to restore or permanently delete
- **Purpose**: Prevents accidental data loss while keeping the note collection organized
- **Trigger**: Click delete icon on a note
- **Progression**: Click delete icon → Note immediately moved to recycle bin → Toast notification with undo option → Open recycle bin to restore or permanently delete
- **Success criteria**: Deleted notes are hidden from main list, stored in recycle bin with attachments intact, and can be restored or permanently deleted

## Edge Case Handling
- **Empty notes**: Allow saving notes with blank content but show "Untitled" for empty titles
- **No notes state**: Show an elegant empty state with guidance to create the first note
- **Empty recycle bin**: Display friendly empty state in recycle bin sheet
- **Search with no results**: Display a friendly "no matches" message
- **Very long notes**: Implement scrolling in editor pane with fixed toolbar
- **Large images**: Auto-resize images to fit editor width while maintaining aspect ratio
- **File size limits**: Show error toast for files over 10MB
- **Multiple attachments**: Support multiple file selection and batch upload
- **Image paste vs text paste**: Detect content type and handle appropriately

## Design Direction
The design should feel clean, professional, and distraction-free like a premium writing tool—think Notion or Bear notes. A minimal interface with subtle shadows and generous whitespace serves the core purpose of focused writing and efficient information retrieval.

## Color Selection
Monochromatic with accent color scheme to maintain focus on content while providing clear interactive cues.

- **Primary Color**: Deep slate (oklch(0.25 0.015 240)) - Communicates professionalism and focus without being harsh
- **Secondary Colors**: 
  - Light background (oklch(0.98 0 0)) for main surface
  - Slightly darker card backgrounds (oklch(0.96 0 0)) for subtle depth
- **Accent Color**: Vibrant blue (oklch(0.55 0.22 250)) for buttons, links, and active states to draw attention to interactive elements
- **Foreground/Background Pairings**:
  - Background (Light warm gray oklch(0.98 0 0)): Dark slate text (oklch(0.25 0.015 240)) - Ratio 12.5:1 ✓
  - Card (Soft gray oklch(0.96 0 0)): Dark slate text (oklch(0.25 0.015 240)) - Ratio 11.8:1 ✓
  - Primary (Deep slate oklch(0.25 0.015 240)): White text (oklch(1 0 0)) - Ratio 12.5:1 ✓
  - Accent (Vibrant blue oklch(0.55 0.22 250)): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓
  - Muted (Light gray oklch(0.92 0 0)): Medium gray text (oklch(0.5 0 0)) - Ratio 6.2:1 ✓

## Font Selection
Use Inter for its excellent readability at all sizes and professional appearance that suits a productivity tool, with clear distinction between different text hierarchies.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/24px/tight letter spacing for strong brand presence
  - H2 (Note Title): Inter Semibold/20px/normal spacing for clear note identification
  - H3 (Section Headers): Inter Semibold/18px/normal spacing
  - Body (Editor): Inter Regular/15px/1.6 line height for comfortable writing
  - UI Labels: Inter Medium/13px/normal spacing for clear interface elements
  - Metadata (dates, counts): Inter Regular/12px/relaxed letter spacing for subtle information

## Animations
Animations should be subtle and purposeful, enhancing the feeling of a responsive tool without calling attention to themselves or creating delays.

- **Purposeful Meaning**: Motion reinforces the relationship between the note list and editor, with smooth transitions that maintain spatial context
- **Hierarchy of Movement**: 
  - High priority: Search filtering (instant, no animation)
  - Medium priority: Note selection transitions (200ms ease)
  - Low priority: Hover states on buttons (100ms ease)

## Component Selection

- **Components**: 
  - **Button**: For primary "New Note" action, delete/restore actions, formatting toolbar, and file uploads
  - **Badge**: To show count of deleted notes and number of attachments
  - **Input**: For search field and note title input
  - **Card**: To display individual notes and attachments with subtle shadows
  - **ScrollArea**: For note list, editor content, and attachment list
  - **Sheet**: For recycle bin side panel with list of deleted notes
  - **AlertDialog**: For permanent delete confirmation from recycle bin
  - **Separator**: To divide toolbar sections and content areas
  - **Tiptap Editor**: Rich text editor with formatting toolbar
  
- **Customizations**: 
  - Custom rich text editor component using Tiptap with full formatting toolbar
  - Custom attachment manager with file type icons and drag-drop support
  - Custom note card showing attachment count badge
  - Single-pane editor (no preview split)
  
- **States**: 
  - Buttons: Subtle scale on hover (1.02), active state for selected formatting
  - Inputs: Blue ring on focus, subtle background color change
  - Note cards: Lift effect on hover (shadow + translateY), distinct active state with accent border
  - Toolbar buttons: Accent background when formatting is active
  - Attachments: Hover state reveals remove button
  
- **Icon Selection**:
  - MagnifyingGlass for search
  - Plus for new note creation
  - Trash for delete action and recycle bin
  - ArrowCounterClockwise for restore action
  - NotePencil for editor indication
  - Paperclip for attachments
  - TextBolder, TextItalic, TextUnderline for formatting
  - File icons (File, FileText, FilePdf, FileArchive, FileImage) for attachment types
  
- **Spacing**: 
  - Container padding: p-6
  - Card padding: p-4
  - Gap between elements: gap-4 for related items, gap-6 for sections
  - Toolbar: p-2 with gap-1 between buttons
  
- **Mobile**: 
  - Full-width editor with responsive toolbar that wraps
  - Touch-friendly 44px minimum button sizes
  - Collapsible attachment section
  - Bottom sheet for recycle bin on mobile
