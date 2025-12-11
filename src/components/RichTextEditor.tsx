import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  TextBIcon, 
  TextItalicIcon, 
  TextUnderlineIcon, 
  TextStrikethroughIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  CodeIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  LinkIcon,
  ImageIcon
} from '@phosphor-icons/react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer'
        }
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...'
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (editor) {
                  editor.chain().focus().setImage({ src }).run();
                }
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const file = files[0];
        if (file.type.indexOf('image') !== -1) {
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (editor) {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coordinates) {
                const node = schema.nodes.image.create({ src });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }
            }
          };
          reader.readAsDataURL(file);
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-2 flex flex-wrap gap-1 bg-muted/30 shrink-0 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent/20' : ''}
        >
          <TextBIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent/20' : ''}
        >
          <TextItalicIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-accent/20' : ''}
        >
          <TextUnderlineIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-accent/20' : ''}
        >
          <TextStrikethroughIcon size={18} />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent/20' : ''}
        >
          H1
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent/20' : ''}
        >
          H2
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent/20' : ''}
        >
          H3
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent/20' : ''}
        >
          <ListBulletsIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent/20' : ''}
        >
          <ListNumbersIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-accent/20' : ''}
        >
          <QuotesIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'bg-accent/20' : ''}
        >
          <CodeIcon size={18} />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent/20' : ''}
        >
          <TextAlignLeftIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent/20' : ''}
        >
          <TextAlignCenterIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent/20' : ''}
        >
          <TextAlignRightIcon size={18} />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-accent/20' : ''}
        >
          <LinkIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addImage}
        >
          <ImageIcon size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
