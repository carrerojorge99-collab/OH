import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Palette, Highlighter, Undo, Redo
} from 'lucide-react';

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
      isActive ? 'bg-orange-100 text-orange-600' : 'text-slate-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const ColorPicker = ({ onChange, currentColor, icon: Icon, title }) => (
  <div className="relative group">
    <button
      type="button"
      className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-600 flex items-center gap-1"
      title={title}
    >
      <Icon className="w-4 h-4" />
      <div 
        className="w-3 h-3 rounded-sm border border-slate-300" 
        style={{ backgroundColor: currentColor || '#000' }}
      />
    </button>
    <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-wrap gap-1 p-2 bg-white border rounded-lg shadow-lg z-50 w-32">
      {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  </div>
);

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Escribe aquí...', 
  className = '',
  minHeight = '120px'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only call onChange if content actually changed
      if (html !== value) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}; padding: 12px;`,
      },
    },
  });

  // Update editor content when value prop changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const setTextColor = useCallback((color) => {
    editor?.chain().focus().setColor(color).run();
  }, [editor]);

  const setHighlightColor = useCallback((color) => {
    editor?.chain().focus().toggleHighlight({ color }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-editor border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-slate-50 border-b">
        {/* Text Formatting */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado"
        >
          <UnderlineIcon className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </MenuButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Colors */}
        <ColorPicker 
          onChange={setTextColor}
          currentColor={editor.getAttributes('textStyle').color}
          icon={Palette}
          title="Color de texto"
        />
        <ColorPicker 
          onChange={setHighlightColor}
          currentColor={editor.getAttributes('highlight').color}
          icon={Highlighter}
          title="Resaltador"
        />

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Lists */}
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Alignment */}
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
        >
          <AlignLeft className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrar"
        >
          <AlignCenter className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
        >
          <AlignRight className="w-4 h-4" />
        </MenuButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Undo/Redo */}
        <MenuButton 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
        >
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
        >
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="bg-white"
      />

      <style>{`
        .rich-text-editor .ProseMirror {
          min-height: ${minHeight};
        }
        .rich-text-editor .ProseMirror:focus {
          outline: none;
        }
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: '${placeholder}';
          color: #94a3b8;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .rich-text-editor .ProseMirror ul,
        .rich-text-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-text-editor .ProseMirror ul {
          list-style-type: disc;
        }
        .rich-text-editor .ProseMirror ol {
          list-style-type: decimal;
        }
        .rich-text-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        .rich-text-editor .ProseMirror p {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
